extends RefCounted
## Deterministic game rules, intentionally independent of graphics and input.

const ARENA := Rect2(70.0, 120.0, 1140.0, 520.0)

static func wave_enemy_count(wave: int) -> int:
    return mini(22, maxi(1, wave) * 2 + 2)


static func clamp_player(position: Vector2) -> Vector2:
    return Vector2(
        clampf(position.x, ARENA.position.x + 18.0, ARENA.end.x - 18.0),
        clampf(position.y, ARENA.position.y + 18.0, ARENA.end.y - 18.0)
    )


static func damage(current_health: int, amount: int) -> int:
    return maxi(0, current_health - maxi(0, amount))


static func can_attack(player_position: Vector2, enemy_position: Vector2) -> bool:
    return player_position.distance_to(enemy_position) <= 100.0
