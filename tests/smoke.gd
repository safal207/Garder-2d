extends SceneTree
## Use: godot --headless --path . --script res://tests/smoke.gd

const Rules = preload("res://scripts/GardenRules.gd")
const MainScene = preload("res://scenes/Main.tscn")

func _initialize() -> void:
    call_deferred("_run")


func _run() -> void:
    var failures: Array[String] = []

    if Rules.wave_enemy_count(1) != 4:
        failures.append("first wave count")
    if Rules.wave_enemy_count(20) != 22:
        failures.append("wave cap")
    if Rules.damage(20, 7) != 13 or Rules.damage(5, 8) != 0:
        failures.append("health clamping")
    if Rules.damage(20, -100) != 20:
        failures.append("no negative damage healing")
    if not Rules.can_attack(Vector2.ZERO, Vector2(50, 20)):
        failures.append("hit inside radius")
    if Rules.can_attack(Vector2.ZERO, Vector2(110, 0)):
        failures.append("hit outside radius")
    if Rules.clamp_player(Vector2(-100, -200)).x < 80:
        failures.append("arena position clamp")

    var game: Node2D = MainScene.instantiate()
    root.add_child(game)
    await process_frame

    if game.get("wave") != 1 or game.get("tree_health") != 100:
        failures.append("initial game state")
    if game.get("spawn_remaining") != 4:
        failures.append("initial enemy schedule")

    game.call("place_trap")
    if game.get("seeds") != 2:
        failures.append("trap costs one seed")
    game.call("restart")
    if game.get("seeds") != 3 or game.get("tree_health") != 100:
        failures.append("restart restores resources")

    game.queue_free()
    if failures.is_empty():
        print("GARDER GAME SMOKE PASS: rules, trap and reset")
        quit(0)
    else:
        push_error("GARDER GAME SMOKE FAIL: " + ", ".join(failures))
        quit(1)
