# Connector specification

The universal connector is the standard that every module and every auto-split
cut depends on. If a module exposes a port, that port is one half of this
connector. Get this right and modules compose freely; get it wrong and nothing
fits.

This document is a design specification. The exact millimeter values below are
proposed defaults to be validated with printed test coupons on the target
printer before Phase 4 hardens them. Where a number is provisional it says so.

## Goals

1. One connector standard, two genders (male and female). Any male port mates
   with any female port of the same section.
2. Friction-fit (no glue, no screws) so a network can be assembled and
   reconfigured by hand. Print-in-place tolerances tuned for the Bambu Lab P1S.
3. Printable without internal support in each part's natural print orientation.
4. Rotational keying (anti-rotation / clocking) so connections do not twist and
   so asymmetric modules land in a known orientation.
5. Works for both round and square sections, with a clear compatibility rule.

## Frame and mating convention

Each port is an oriented frame (see [DATA_MODEL.md](./DATA_MODEL.md)):

- Local +Z points outward along the connection axis (away from the module body).
- Local +X is the key reference direction (where the anti-rotation feature sits).
- The origin sits at the mating reference plane (the face where two parts meet).

Mating rule: two ports mate when their world frames are brought to the same
origin with their +Z axes anti-parallel (pointing into each other) and their +X
key directions aligned according to the allowed clocking. The editor's snapping
computes the rigid transform that achieves this (see
[research/threejs-editor.md](./research/threejs-editor.md)).

Compatibility (also enforced as invariant 5 in the data model):

- opposite gender (one male, one female), and
- equal section shape (round-to-round, square-to-square), and
- equal nominal size within tolerance.

Round and square are NOT cross-compatible. A `transition` module is the only way
to go between two different sections (round-to-round of different size, or
round-to-square). See [MODULES.md](./MODULES.md).

## Geometry: round connector

A male spigot that inserts into a female socket, sharing a common nominal bore
so the internal tube diameter is continuous (no lip for an animal to catch on).

Proposed parameters (provisional, to be coupon-tested):

- Nominal bore `D`: the continuous internal diameter (for example 40 mm for a
  small-rodent tube). This is `Section.nominalSize`.
- Wall thickness `w`: default from project settings (2 to 4 mm; see
  research/printing-and-materials.md).
- Male spigot outer diameter: `D + 2*w`.
- Female socket inner diameter: male outer diameter + clearance `c`.
- Engagement length `L`: how deep the spigot inserts. Provisional `L = 0.4*D`,
  clamped to a sensible min/max, long enough to resist wobble.
- A shoulder/stop on the male so insertion bottoms out at the mating plane,
  keeping the bore continuous.

Friction-fit clearance `c`: provisional radial clearance ~0.2 mm (diametral
~0.4 mm) for a hand-press fit on the P1S. This is the single most important
number to validate with test prints; it depends on filament, flow calibration,
and shrinkage. Expose it as a tunable so users can re-fit for their printer.

Lead-in chamfer: a small chamfer (for example 0.6 mm at 45) on the spigot tip
and the socket mouth to ease starting the fit and to print cleanly.

## Geometry: square connector

Same male-into-female principle with a square cross-section. The square shape is
inherently anti-rotation (it can only seat at 90-degree increments), so for
square ports the keying is the section itself.

Proposed parameters mirror the round case: nominal inner side `S`
(`Section.nominalSize`), wall `w`, male outer side `S + 2*w`, female inner side
male outer + clearance `c`, engagement `L`, lead-in chamfer, bottoming shoulder.

Default clocking for square: 4-fold (0, 90, 180, 270). Asymmetric square modules
may restrict allowed clocking.

## Rotational keying (round)

A round friction-fit alone would let parts spin. Add a key so orientation is
deterministic:

- A single key (a small rib on the male, a matching notch on the female) along
  the local +X direction. One key gives a unique, detented orientation
  (1-fold), which is what asymmetric modules (elbow, tee, platform mount) need.
- Optionally allow N-fold keys (for example 4 ribs) for modules where any of N
  orientations is acceptable, trading orientation freedom for assembly ease.

The key rib/notch must itself print without support: keep its overhang within
~45 degrees, or shape it as a teardrop/triangular rib. Provisional key size:
rib ~1.5 mm wide by ~1 mm proud, with the same clearance philosophy as the fit.

Detrompage (poka-yoke): because the key is at +X and ports carry their key
direction in their frame, the editor can show the exact assembled orientation,
and the printed parts can only seat one way. This is what makes the physical
build match the on-screen design.

## Printability checklist for the connector

- In the part's natural print orientation, neither the spigot, the socket mouth,
  nor the key creates an overhang beyond ~45 degrees without being a
  teardrop/chamfer. See research/printing-and-materials.md.
- Bore stays continuous across the joint (no internal lip) so the animal-facing
  surface is smooth.
- Ventilation features (if any) on the connector follow the same support-free
  rule.

## Use at auto-split cuts (Phase 5)

When a part is too large for the print box, the auto-split inserts a connector
pair at each cut plane: a male on one sub-part, a female on the other, using the
local section at the cut. The split planner must place cuts where a clean
circular (or square) connector fits, avoid cutting through other features, and
record the connector and clocking in the assembly manifest so the printed
sub-parts rejoin correctly. See [ARCHITECTURE.md](./ARCHITECTURE.md) export flow.

## Open questions / to validate

- Final clearance `c` for the P1S with PETG (coupon test matrix: 0.10, 0.15,
  0.20, 0.25 mm radial).
- Engagement length `L` vs bore for a wobble-free yet easy-to-separate fit.
- Whether a retention feature (snap bead/detent) is needed, or pure friction
  suffices for the tube weights involved.
- Key geometry that is robust to repeated assembly without wearing loose.
- A single nominal bore for the MVP vs a small set of standard sizes. Leaning:
  pick one MVP bore, keep `Section.nominalSize` so more sizes are additive.
