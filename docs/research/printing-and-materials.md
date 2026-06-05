# Research: 3D printing constraints and rodent material safety

Status: researched 2026-06-06. The build volume drives auto-split (Phase 5); the
design rules drive the OpenSCAD module library (Phase 4); the safety notes are
product constraints surfaced to users.

## Target printer: Bambu Lab P1S

- Build volume: 256 x 256 x 256 mm (confirmed; widely cited official figure).
- Practical Z is ~250 mm, not 256: Bambu Studio defaults the printable height to
  250 mm to avoid toolhead/heatbed collisions. The extra ~6 mm needs a manual
  override.
- Front-left exclusion zone: the P1 series has a foldable stopper at the
  front-left that the filament cutter presses against; Bambu Studio enforces a
  no-print zone there (community/wiki figure ~18 x 28 mm). It is only enforced
  when the filament cutter/AMS is active.
- Enclosed CoreXY with an all-metal hotend rated to 300 C. The enclosure suits
  higher-temp, warp-prone materials (PETG, ABS, ASA).

Warren design budget (decision, see [DECISIONS.md](../DECISIONS.md)): treat the
usable build box as 250 x 250 x 250 mm and keep a configurable safety margin
(default a few mm). Auto-split must keep every output part within this box, and
the value must be a setting because users may own other printers. The default
print-bed setting is named in [DATA_MODEL.md](../DATA_MODEL.md) (project
settings).

## Material choice for rodent habitats

Honest bottom line first: no FDM print is truly chew-safe or guaranteed
food-safe. Two independent reasons, both worth surfacing to users:

- Ingestion risk: rodents gnaw instinctively; chewed plastic can shed fragments
  that may be swallowed. PLA in particular can splinter.
- Hygiene: FDM layer lines create micro-grooves that harbor bacteria/mold and
  cannot be fully cleaned, so FDM prints are generally not food-safe regardless
  of filament.

Relative comparison:

- PETG: most often recommended for habitats. More durable and chew-resistant
  than PLA, tolerant of dishwasher cleaning up to ~60 C, better moisture and
  chemical resistance. Glass transition ~80 to 85 C. Best general choice but
  still not chew-proof. Caveat: not strong enough for boiling-water sanitizing.
- PLA: generally advised against. Brittle, prone to splintering, low glass
  transition ~60 C so it can warp in a dishwasher or warm room, and it slowly
  degrades (hydrolyzes).
- ABS/ASA: enclosure makes them printable, but ABS is commonly discouraged
  around animals (styrene fumes while printing). This is hobbyist consensus, not
  a formal toxicology finding. ASA/nylon are sometimes cited as durable
  higher-temp alternatives.

Warren stance: recommend PETG as the default material in the UI copy, state the
chew/ingestion and hygiene caveats plainly, and never claim any plastic is safe
for a rodent to eat.

## Design-for-print rules (drive the OpenSCAD module library)

These are standard FDM best practices, applied to tubes:

- Print tubes/cylinders vertically (axis along Z) when possible: a vertical tube
  prints as stacked rings, needs no internal support, and yields a smoother,
  more uniform bore. A horizontal tube turns the upper inner wall into an
  overhang/bridge that sags and usually needs hard-to-remove internal supports
  (rough internal surfaces can injure an animal).
- Keep unsupported overhangs <= ~45 degrees from vertical. 45 to 50 is reliable;
  with good cooling/PETG you may push to ~60. Beyond that, support or redesign.
- Horizontal holes/ports: use teardrop or diamond shapes. A round horizontal
  hole's top is a >45 overhang that sags; a teardrop (45 apex on top) prints
  support-free. Especially for holes larger than ~10 mm.
- Prefer 45 chamfers over fillets on downward-facing overhangs (a fillet on a
  downward face creates a shallow sagging overhang). Use fillets freely on
  animal-contact surfaces where they do not create overhangs.
- Wall thickness: habitat guidance suggests ~2 to 4 mm walls. Walls must be a
  multiple of the line width or the slicer may drop them; go thicker for
  chew/strength. Use high infill on solid contact parts to avoid hidden cavities.
- Smooth internal surfaces and rounded edges: better for animal safety and for
  cleanability. Vertical printing of the bore helps.

Ventilation: tubes that animals occupy must have vent/air holes so an animal
cannot suffocate (especially dead-ends, connectors, or trap points). The
requirement is firm; exact hole size/spacing is not standardized. Practical
approach: frequent small vents along enclosed runs, small enough that heads/limbs
cannot get caught, large enough for airflow, teardrop/diamond shaped so they
print support-free.

## Implications captured elsewhere

- The connector must be printable in the part's natural print orientation
  without internal support. See [CONNECTOR_SPEC.md](../CONNECTOR_SPEC.md).
- Each module's OpenSCAD parameters expose wall thickness, bore diameter, and
  vent options. See [MODULES.md](../MODULES.md).

## Sources

- https://wiki.bambulab.com/en/knowledge-sharing/print-volume-limitations
  (build volume, 250 mm Z default, cutter exclusion zone)
- https://bambulab.com/en-us/p1 (official product page; build volume)
- https://3dpros.com/printers/bambu-lab-p1s (256 cube, enclosed CoreXY, 300 C)
- https://habitathomies.com/blogs/research-education/3d-printing-guide-safe-enriching-rodent-habitats
  (PETG vs PLA for habitats, wall thickness, rounded/smooth surfaces, chew risk)
- https://3dprinterly.com/is-pla-really-safe-animals-food-plants-more/ (PLA
  animal-safety caveats, layer-line bacteria / not food-safe)
- https://all3dp.com/2/pla-petg-glass-transition-temperature-3d-printing/ (Tg
  values for PLA/PETG/ABS)
- https://www.wevolver.com/article/petg-glass-transition-temperature (PETG Tg,
  not boiling-water safe)
- https://www.pollen.am/design_for_3d_printing_holes/ (vertical vs horizontal
  holes, teardrop)
- https://3dprinterly.com/how-to-3d-print-holes-without-supports-is-it-possible/
  (teardrop holes, support-free design)
