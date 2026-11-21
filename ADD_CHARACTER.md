# Add your own fighter

No image editing. No scripts. Draw the pictures, put them in a folder, add one line.

## 1. Pictures

One picture per move. Each picture = the same character in **3–6 poses in one row**.

| Rule | Why |
| --- | --- |
| Plain **green** background (`#00FF00`), nothing else on it | the game removes the background by itself |
| Poses **do not touch** each other | the game cuts the picture at the gaps |
| **Whole body** in every pose, same size | head or feet cut off = broken animation |
| Character faces **left** | or set `flip: true` (step 3) |
| First pose = normal standing pose | the game uses it to size the fighter |
| No text, no shadows, no effects | they become part of the fighter |

## 2. File names

Folder: `public/assets/<id>/` — `<id>` is lowercase english, no spaces (`naruto`, `my-hero`).

| File | Move | |
| --- | --- | --- |
| `idle.png` | standing, breathing | needed |
| `walk.png` | walking | needed |
| `punch.png` | light attack | needed |
| `kick.png` | heavy attack | needed |
| `hit.png` | getting hit | needed |
| `ko.png` | falling down, last pose lying | needed |
| `jump.png` `crouch.png` `block.png` `special.png` | | bonus |
| `portrait.png` | face for the select screen | bonus |

`.jpg` and `.webp` also work. A missing picture is replaced by another one
(`walk` → `idle`, `kick` → `punch` → `idle` …), so the fighter works with `idle.png` alone.

## 3. One line of code

`src/game/myFighters.ts`:

```ts
export const MY_FIGHTERS: MyFighter[] = [
  { id: 'naruto', name: 'Naruto' },
];
```

| Option | When |
| --- | --- |
| `flip: true` | the pictures face right |
| `frames: { kick: 4 }` | the game counted the poses of `kick` wrong |

The fighter appears first on the select screen.

## Check

Open the browser console (F12). One line per fighter:

```
[my-fighter] naruto: idle 4, walk 4, punch 4, kick 4, hit 3, ko 5, jump -, crouch -, block -, special -
```

Number = poses found. `-` = picture not found (check the folder and file name).

| Problem | Fix |
| --- | --- |
| Two bodies in one frame | poses touch — redraw with more space, or `frames: { punch: 4 }` |
| Green edge around the fighter | background was not plain green — redraw |
| Parts of the fighter are missing | the fighter has the background colour on it — use a magenta background |
| Fighter looks at the wrong side | `flip: true` |
| Too big / too small | Debug Console → Fighter Playground → Scale |

## For AI agents

To add a fighter: put the user's pictures in `public/assets/<id>/` **unchanged**
and add one entry to `MY_FIGHTERS`. Do not resize, crop, recolour or re-encode
the pictures and do not write image scripts — `src/game/rawSheet.ts` does all of
that in the browser at boot. Do not create a `CharacterDefinition` by hand.
