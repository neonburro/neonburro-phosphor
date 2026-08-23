# the sigil dataset

<!-- the design for the attribute items Tyler asked for on 2026-08-23. not
     built yet. this file is the contract for whoever builds it. -->

## what a sigil is

Every holder carries a small set of attributes beside their assigned handle.
They read as symbols, numbers and colours before words, because the burrow is
meant to work for someone who shares no language with the room. An attribute
is an ITEM in the neonburro system, and items are one dataset shared by the
burrow, the treasure map on the burroship and eventually the shop's digital
shelf. One table, many rooms.

## the six kinds, Tyler's list

- **an animal** of the valley. marmot, pika, raven, trout, bighorn, lynx
- **an object** off the bench. lantern, compass, anvil, key, spool, bell
- **a liquid.** snowmelt, ink, resin, mercury, cider, dew
- **an energy.** ember, static, pulse, tide, hum, flare
- **an envelope** with a mystery gift in it. sealed, openable once, contents
  assigned when opened, the only kind with a surprise inside
- **a clue.** a trailhead on the treasure map. some cost NEONBURRO, see the
  studio's token rules before pricing anything

## the shape of one item

```
id          slug, stable forever
kind        animal | object | liquid | energy | envelope | clue
name        lowercase, one or two words
glyph       one drawn mark, svg, the woodblock line style, japanese clouds
            allowed in the art but the glyph itself stays simple
hue         one of the burrow's named hues, teal family plus earth tones
number      minted count, every issued copy carries its index
rarity      common | uncommon | rare | one
carries     optional payload. a clue's text, an envelope's gift id
map_pin     optional. where on the ridgway map this item points
```

## how they are issued

Assigned at first entry (two commons), earned in the room, bought with
NEONBURRO (clues), found on the map. Issued copies live in a
`burrow_items` table keyed to the holder's wallet with the item id and the
copy number. The glyph art comes from Tyler's directory, thousands of
avatars and marks, referenced by filename, never generated at runtime.

## why this is one dataset and not per app

The map on the burroship needs a pin to know its item. The shop needs the
same item to sell its print. The burrow needs it on a profile. Three copies
of the list drift in a week. One table on the shared project, read by all
three, written from one place.
