extends Node2D
## Garder-2d: first playable solo vertical slice.
## Everything drawn in code: no third-party art, music or cloud services.

const Rules = preload("res://scripts/GardenRules.gd")
const CENTER := Vector2(640.0, 367.0)
const PLAYER_SPEED := 245.0
const FONT_SIZE := 17

var rng := RandomNumberGenerator.new()
var player_position := Vector2(640.0, 510.0)
var tree_health := 100
var wave := 1
var score := 0
var seeds := 3
var spawn_remaining := 0
var spawn_timer := 0.0
var next_wave_timer := 0.0
var player_facing := Vector2.UP
var enemies: Array[Dictionary] = []
var traps: Array[Vector2] = []
var game_over := false
var attack_flash := 0.0
var time_elapsed := 0.0
var screenshot_path := ""


func _ready() -> void:
    rng.seed = 2207
    restart()
    screenshot_path = OS.get_environment("GARDER_SCREENSHOT_PATH")
    if not screenshot_path.is_empty():
        call_deferred("_capture_screenshot")


func restart() -> void:
    rng.seed = 2207
    player_position = Vector2(640.0, 510.0)
    tree_health = 100
    wave = 1
    score = 0
    seeds = 3
    game_over = false
    attack_flash = 0.0
    time_elapsed = 0.0
    enemies.clear()
    traps.clear()
    _start_wave()
    queue_redraw()


func _start_wave() -> void:
    spawn_remaining = Rules.wave_enemy_count(wave)
    spawn_timer = 0.35
    next_wave_timer = 0.0


func _physics_process(delta: float) -> void:
    if game_over:
        return

    time_elapsed += delta
    attack_flash = maxf(0.0, attack_flash - delta)
    var move := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    if Input.is_key_pressed(KEY_A):
        move.x -= 1.0
    if Input.is_key_pressed(KEY_D):
        move.x += 1.0
    if Input.is_key_pressed(KEY_W):
        move.y -= 1.0
    if Input.is_key_pressed(KEY_S):
        move.y += 1.0
    if move.length_squared() > 0.0:
        move = move.normalized()
        player_facing = move
        player_position = Rules.clamp_player(player_position + move * PLAYER_SPEED * delta)

    if spawn_remaining > 0:
        spawn_timer -= delta
        if spawn_timer <= 0.0:
            _spawn_enemy()
            spawn_remaining -= 1
            spawn_timer = 1.25

    for i in range(enemies.size() - 1, -1, -1):
        var enemy: Dictionary = enemies[i]
        var position: Vector2 = enemy["position"]
        position = position.move_toward(CENTER, float(enemy["speed"]) * delta)
        enemy["position"] = position

        var hit_trap := false
        for t in range(traps.size() - 1, -1, -1):
            if position.distance_to(traps[t]) <= 22.0:
                traps.remove_at(t)
                hit_trap = true
                score += 10
                if score % 30 == 0:
                    seeds += 1
                break
        if hit_trap:
            enemies.remove_at(i)
            continue
        if position.distance_to(CENTER) < 45.0:
            tree_health = Rules.damage(tree_health, 9)
            enemies.remove_at(i)
            if tree_health <= 0:
                game_over = true

    if not game_over and enemies.is_empty() and spawn_remaining == 0:
        if next_wave_timer <= 0.0:
            next_wave_timer = 2.4
        else:
            next_wave_timer -= delta
            if next_wave_timer <= 0.0:
                wave += 1
                seeds += 1
                _start_wave()
    queue_redraw()


func _spawn_enemy() -> void:
    var edge := rng.randi_range(0, 3)
    var pos := CENTER
    match edge:
        0:
            pos = Vector2(Rules.ARENA.position.x + 15.0, rng.randf_range(145.0, 610.0))
        1:
            pos = Vector2(Rules.ARENA.end.x - 15.0, rng.randf_range(145.0, 610.0))
        2:
            pos = Vector2(rng.randf_range(95.0, 1180.0), Rules.ARENA.position.y + 15.0)
        _:
            pos = Vector2(rng.randf_range(95.0, 1180.0), Rules.ARENA.end.y - 15.0)
    enemies.append({"position": pos, "speed": 54.0 + minf(60.0, wave * 5.0)})


func attack() -> void:
    if game_over:
        return
    attack_flash = 0.2
    for i in range(enemies.size() - 1, -1, -1):
        var position: Vector2 = enemies[i]["position"]
        if Rules.can_attack(player_position, position):
            enemies.remove_at(i)
            score += 10
            if score % 30 == 0:
                seeds += 1
    queue_redraw()


func place_trap() -> void:
    if game_over or seeds <= 0:
        return
    if player_position.distance_to(CENTER) < 58.0:
        return
    var p := Rules.clamp_player(player_position + player_facing * 38.0)
    for other in traps:
        if p.distance_to(other) < 30.0:
            return
    traps.append(p)
    seeds -= 1
    queue_redraw()


func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey:
        var key: InputEventKey = event
        if key.pressed and not key.echo:
            if key.keycode == KEY_R:
                restart()
            elif key.keycode == KEY_SPACE:
                attack()
            elif key.keycode == KEY_T:
                place_trap()
    elif event is InputEventMouseButton:
        var click: InputEventMouseButton = event
        if click.pressed and click.button_index == MOUSE_BUTTON_LEFT:
            attack()


func _draw() -> void:
    draw_rect(Rect2(Vector2.ZERO, Vector2(1280.0, 720.0)), Color("#0e1721"))
    draw_rect(Rules.ARENA, Color("#1a382f"), true)
    draw_rect(Rules.ARENA, Color("#547a65"), false, 3.0)

    # Mowed rows and small seed-like details make the field legible without assets.
    for x in range(95, 1200, 60):
        draw_line(Vector2(float(x), 123.0), Vector2(float(x), 638.0), Color(0.20, 0.39, 0.30, 0.29), 1.0)
    for y in range(142, 640, 55):
        draw_line(Vector2(74.0, float(y)), Vector2(1205.0, float(y)), Color(0.19, 0.38, 0.28, 0.25), 1.0)
    for i in range(36):
        var pos := Vector2(96.0 + float((i * 97) % 1080), 145.0 + float((i * 71) % 470))
        draw_circle(pos, 2.0, Color("#6b9363"))

    # Heart of the garden: tree, exposed roots and visible health ring.
    draw_circle(CENTER + Vector2(0, 22), 72.0, Color(0, 0, 0, 0.16))
    for direction in [Vector2(-1.0, 1.0), Vector2(1.0, 1.0)]:
        draw_line(CENTER + Vector2(0, 18), CENTER + direction * 34.0, Color("#74543f"), 8.0)
    draw_rect(Rect2(CENTER + Vector2(-12, -12), Vector2(24, 65)), Color("#846249"))
    draw_circle(CENTER + Vector2(-25, -38), 37.0, Color("#65ad65"))
    draw_circle(CENTER + Vector2(22, -51), 42.0, Color("#83c773"))
    draw_circle(CENTER + Vector2(2, -69), 39.0, Color("#b1e287"))
    draw_arc(CENTER + Vector2(0, -39), 72.0, PI, TAU, 48, Color("#4a6865"), 8.0)
    draw_arc(CENTER + Vector2(0, -39), 72.0, PI, PI + PI * float(tree_health) / 100.0, 48, Color("#dcf69e"), 8.0)

    # Traps, enemies and player — all rendered as native vector geometry.
    for trap_pos in traps:
        draw_circle(trap_pos, 17.0, Color("#b5d5ac"))
        draw_colored_polygon(PackedVector2Array([
            trap_pos + Vector2(0, -14), trap_pos + Vector2(14, 12),
            trap_pos + Vector2(-14, 12)]), Color("#385c63"))
    for enemy in enemies:
        var p: Vector2 = enemy["position"]
        draw_circle(p + Vector2(0, 6), 15.0, Color(0, 0, 0, 0.28))
        draw_circle(p, 13.0, Color("#d78b6e"))
        draw_circle(p + Vector2(-4, -2), 2.5, Color("#201d2a"))
        draw_circle(p + Vector2(4, -2), 2.5, Color("#201d2a"))
    draw_circle(player_position + Vector2(0, 6), 19.0, Color(0, 0, 0, 0.24))
    draw_circle(player_position, 16.0, Color("#c5b6f3"))
    draw_circle(player_position + player_facing * 6.0, 5.0, Color("#f0f2fa"))
    if attack_flash > 0.0:
        draw_arc(player_position, 100.0, 0.0, TAU, 56, Color("#dcf69e"), 4.0)

    var font: Font = ThemeDB.fallback_font
    draw_string(font, Vector2(72, 66), "GARDER  /  THE LAST GARDEN", HORIZONTAL_ALIGNMENT_LEFT, -1, 31, Color("#e8f1dc"))
    draw_string(font, Vector2(74, 97), "PROTOTYPE 01     Protect the ancient tree", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color("#a6b6c2"))
    draw_string(font, Vector2(840, 67), "WAVE  %02d    HP  %03d    SEEDS  %d    SCORE  %d" % [wave, tree_health, seeds, score], HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, Color("#d7fa82"))
    draw_string(font, Vector2(72, 679), "WASD / arrows move    SPACE / click attack    T place trap    R restart", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#c9d8d7"))
    if game_over:
        draw_rect(Rect2(362, 275, 556, 136), Color(0.06, 0.10, 0.14, 0.93))
        draw_string(font, Vector2(446, 336), "THE GARDEN FELL", HORIZONTAL_ALIGNMENT_LEFT, -1, 34, Color("#f6c1a6"))
        draw_string(font, Vector2(459, 377), "Press R to try again", HORIZONTAL_ALIGNMENT_LEFT, -1, 19, Color("#d7fa82"))


func _capture_screenshot() -> void:
    await get_tree().create_timer(1.3).timeout
    var image: Image = get_viewport().get_texture().get_image()
    var result: Error = image.save_png(screenshot_path)
    if result != OK:
        push_error("Unable to save gameplay screenshot to " + screenshot_path)
        get_tree().quit(1)
    else:
        print("GARDER_SCREENSHOT_SAVED=" + screenshot_path)
        get_tree().quit(0)
