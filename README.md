# Underflow
A first-person, psychological horror rail-shooter and exploration game. Strapped into an infinite waterslide raft, you are propelled through the endless, moist labyrinth of the Poolrooms—a watery sub-layer of the Backrooms.

## Play
`index.html` is the current playable prototype (Combat Build 02). It's a single self-contained file, so you can open it directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

### Controls
| Action | Keyboard / mouse |
| --- | --- |
| Fire | Hold left click |
| Recharge | `R` |
| Dodge | `A` / `D` |
| Boost | `Shift` |
| Exit raft | `E` |

Touch controls appear on mobile.

## Design
See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) for the full concept, mechanics, target architecture and what's built so far.
