"""
─────────────────────────────────────────────────────────────────────────────
The draw engine. Isolated from views so it can be unit-tested independently.

DESIGN: All state changes inside run_draw() are wrapped in a single
atomic transaction. If anything fails (DB write, constraint violation),
the entire draw is rolled back — no partial state left in the DB.

DRAW LOGIC OVERVIEW
────────────────────
1.  Lock draw row (select_for_update) to prevent duplicate concurrent runs.
2.  Snapshot every active subscriber's latest ≤5 scores into DrawEntry.
    Users with zero scores are skipped but still counted toward the prize pool.
3.  Generate 5 drawn numbers (1–45):
      random      → pure random.sample
      algorithmic → weighted by score frequency across all entries
4.  Count intersections between each entry's numbers and drawn numbers.
5.  Calculate prize pool: active_count × PRIZE_POOL_CONTRIBUTION_MONTHLY
6.  Add rollover (unclaimed 5-match jackpot from last published draw).
7.  Create PrizeTier records (40% / 35% / 25%).
8.  Create Winner rows for every entry with ≥3 matches.
9.  Distribute each tier's pool equally among its winners.
10. Set draw.status = 'simulated'.

Only admin can then call publish_draw() which flips status → 'published'.
"""

import random
from collections import Counter
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from scores.models import GolfScore
from Subscription.models import Subscription

from .models import Draw, DrawEntry, PrizeTier


# ── Public API ────────────────────────────────────────────────────────────────

def run_draw(draw: Draw) -> dict:
    """
    Execute a draw simulation. Sets status to 'simulated'.
    Raises ValueError if the draw is not in 'pending' state.
    Returns a summary dict for the API response.
    """
    if draw.status != "pending":
        raise ValueError(
            f"Cannot run draw: status is '{draw.status}'. Only 'pending' draws can be run."
        )

    with transaction.atomic():
        # Lock the row so concurrent admin requests don't double-run the draw
        draw = Draw.objects.select_for_update().get(pk=draw.pk)

        # Re-check inside lock
        if draw.status != "pending":
            raise ValueError("Draw was already run by another request.")

        # ── Step 1: Collect active subscribers and their scores ────────────
        active_subs = list(
            Subscription.objects.filter(status="active").select_related("user")
        )
        active_count = len(active_subs)

        entries_data = []       # List of (user, score_list) tuples
        all_scores_flat = []   # Every score value, used for algorithmic weighting

        for sub in active_subs:
            user_scores = list(
                GolfScore.objects.filter(user=sub.user)
                .order_by("-date")
                .values_list("score", flat=True)[: settings.MAX_STORED_SCORES]
            )
            # Collect scores for weighting regardless of whether user enters
            all_scores_flat.extend(user_scores)

            # Only users with ≥1 score participate in number matching
            if user_scores:
                entries_data.append((sub.user, user_scores))

        # ── Step 2: Generate drawn numbers ────────────────────────────────
        drawn_numbers = _generate_drawn_numbers(draw.draw_type, all_scores_flat)
        drawn_set = set(drawn_numbers)

        # ── Step 3: Calculate prize pool ──────────────────────────────────
        base_pool = Decimal(str(active_count)) * settings.PRIZE_POOL_CONTRIBUTION_MONTHLY
        rollover = _get_rollover_amount(draw)
        total_pool = base_pool + rollover

        # ── Step 4: Create PrizeTier records ─────────────────────────────
        tiers = _create_prize_tiers(draw, base_pool, rollover)

        # ── Step 5: Create DrawEntry records + identify winners ──────────
        entries_to_create = []
        winners_by_tier: dict[str, list] = {
            "five_match": [],
            "four_match": [],
            "three_match": [],
        }

        for user, user_scores in entries_data:
            user_set = set(user_scores)
            match_count = len(user_set & drawn_set)

            is_winner = match_count >= 3
            entries_to_create.append(
                DrawEntry(
                    draw=draw,
                    user=user,
                    numbers=user_scores,
                    matches=match_count,
                    is_winner=is_winner,
                )
            )

            if match_count == 5:
                winners_by_tier["five_match"].append(user)
            elif match_count == 4:
                winners_by_tier["four_match"].append(user)
            elif match_count == 3:
                winners_by_tier["three_match"].append(user)

        DrawEntry.objects.bulk_create(entries_to_create)

        # ── Step 6: Calculate per-winner amounts + create Winner rows ─────
        from winners.models import Winner

        winner_rows = []
        for tier_name, tier_winners in winners_by_tier.items():
            tier_obj = tiers[tier_name]
            count = len(tier_winners)
            tier_obj.winner_count = count

            if count > 0:
                per_winner = (tier_obj.total_pool / Decimal(str(count))).quantize(
                    Decimal("0.01")
                )
                tier_obj.amount_per_winner = per_winner

                for user in tier_winners:
                    winner_rows.append(
                        Winner(
                            user=user,
                            draw=draw,
                            prize_tier=tier_obj,
                            amount=per_winner,
                        )
                    )
            else:
                tier_obj.amount_per_winner = Decimal("0.00")

            tier_obj.save()

        if winner_rows:
            Winner.objects.bulk_create(winner_rows)

        # ── Step 7: Persist draw results ──────────────────────────────────
        draw.drawn_numbers = drawn_numbers
        draw.status = "simulated"
        draw.total_prize_pool = total_pool
        draw.active_subscriber_count = active_count
        draw.save()

    return {
        "drawn_numbers": drawn_numbers,
        "total_entries": len(entries_data),
        "active_subscribers": active_count,
        "skipped_no_scores": active_count - len(entries_data),
        "total_prize_pool": str(total_pool),
        "rollover_applied": str(rollover),
        "winners": {tier: len(w) for tier, w in winners_by_tier.items()},
        "tiers": {
            tier: {
                "pool": str(tiers[tier].total_pool),
                "winners": tiers[tier].winner_count,
                "per_winner": str(tiers[tier].amount_per_winner),
            }
            for tier in ("five_match", "four_match", "three_match")
        },
    }


def publish_draw(draw: Draw) -> None:
    """
    Transition draw from 'simulated' → 'published'.
    This makes results visible to all users.
    Raises ValueError if draw is not in 'simulated' state.
    """
    if draw.status != "simulated":
        raise ValueError(
            f"Cannot publish draw: status is '{draw.status}'. "
            "Run the draw simulation first."
        )
    draw.status = "published"
    draw.published_at = timezone.now()
    draw.save(update_fields=["status", "published_at"])


def reset_draw(draw: Draw) -> None:
    """
    Reset a 'simulated' draw back to 'pending' so it can be re-run.
    Deletes all DrawEntry and Winner records for this draw.
    Useful if admin wants to change draw_type and re-simulate.
    """
    if draw.status not in ("simulated",):
        raise ValueError("Only 'simulated' draws can be reset (not pending or published).")

    with transaction.atomic():
        from winners.models import Winner
        Winner.objects.filter(draw=draw).delete()
        DrawEntry.objects.filter(draw=draw).delete()
        draw.prize_tiers.all().delete()

        draw.drawn_numbers = []
        draw.status = "pending"
        draw.total_prize_pool = Decimal("0.00")
        draw.active_subscriber_count = 0
        draw.save()


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _generate_drawn_numbers(draw_type: str, all_scores: list[int]) -> list[int]:
    """
    Generate exactly 5 unique integers from [STABLEFORD_MIN, STABLEFORD_MAX].

    Random mode:
        Pure random.sample — every number equally likely.

    Algorithmic mode:
        Numbers that appear MORE FREQUENTLY in active users' scores have a
        HIGHER probability of being drawn.

        Counterintuitive implication: a common score (e.g. 20) is more likely
        to be drawn, which means MORE users match it → prize splits more ways
        → smaller individual payout. Playing an uncommon score is harder but
        more valuable if it gets drawn.

    Tradeoff: Algorithmic adds game-theory depth but may confuse casual users.
    Admin can switch draw_type per month.
    """
    lo = settings.STABLEFORD_MIN   # 1
    hi = settings.STABLEFORD_MAX   # 45
    full_range = list(range(lo, hi + 1))

    if draw_type != "algorithmic" or not all_scores:
        return sorted(random.sample(full_range, 5))

    # Build weighted pool: repeat each value proportional to its frequency
    freq = Counter(all_scores)
    weighted_pool: list[int] = []
    for val in full_range:
        # Always include each value at least once so all are reachable
        weight = freq.get(val, 0) + 1
        weighted_pool.extend([val] * weight)

    # Sample 5 unique values via reservoir-style loop
    drawn: set[int] = set()
    pool_copy = weighted_pool.copy()
    random.shuffle(pool_copy)

    for candidate in pool_copy:
        drawn.add(candidate)
        if len(drawn) == 5:
            break

    # Safety fallback (should never be needed with range 1–45 and 5 draws)
    if len(drawn) < 5:
        extras = set(full_range) - drawn
        drawn.update(list(extras)[: 5 - len(drawn)])

    return sorted(drawn)


def _get_rollover_amount(current_draw: Draw) -> Decimal:
    """
    Find the most recently published draw where the 5-match jackpot had
    zero winners (meaning it rolled over). Return its full pool amount
    (which already includes any prior rollover it inherited).

    Only the 5-match tier rolls over per the PRD.
    All other tiers do NOT roll over.
    """
    previous = (
        Draw.objects.filter(status="published")
        .exclude(pk=current_draw.pk)
        .order_by("-year", "-month")
        .first()
    )

    if not previous:
        return Decimal("0.00")

    jackpot_tier = previous.prize_tiers.filter(tier="five_match").first()
    if jackpot_tier and jackpot_tier.winner_count == 0:
        # Roll the entire pool (base + any prior rollover) into this draw
        return jackpot_tier.total_pool

    return Decimal("0.00")


def _create_prize_tiers(
    draw: Draw, base_pool: Decimal, rollover: Decimal
) -> dict[str, PrizeTier]:
    """
    Create PrizeTier rows for all three tiers.
    Returns a dict keyed by tier name for easy lookup.

    Pool distribution (from settings.PRIZE_TIER_PERCENTAGES):
        five_match  → 40% of base_pool  + rollover
        four_match  → 35% of base_pool
        three_match → 25% of base_pool
    """
    percentages = settings.PRIZE_TIER_PERCENTAGES
    tiers: dict[str, PrizeTier] = {}

    for tier_name, pct in percentages.items():
        pool_slice = (base_pool * pct).quantize(Decimal("0.01"))
        extra = rollover if tier_name == "five_match" else Decimal("0.00")

        tier_obj = PrizeTier.objects.create(
            draw=draw,
            tier=tier_name,
            pool_amount=pool_slice,
            rollover_amount=extra,
            # winner_count and amount_per_winner set after match calculation
        )
        tiers[tier_name] = tier_obj

    return tiers