# Location check

Checked 73 mapped schemes (site and area precision). Region-wide schemes are not on the map and are not checked.

Rules: flag a site more than 2km from the Nominatim geocode of its `place`; flag any scheme more than 10km outside its region polygon.
Coordinates in `data/schemes.json` have **not** been changed. A geocode of a town name gives the town centre, so a flag is a prompt to check, not proof of an error.

## Flagged for review (2)

| Scheme | Precision | Place | Entered (lat, lng) | Geocode (lat, lng) | Offset (km) | Outside region (km) | Flag |
|---|---|---|---|---|---|---|---|
| tv-teesworks | site | Redcar | 54.605, -1.12 | 54.6179, -1.0688 | 3.6 | inside | 3.6km from geocode |
| gcr-amids | site | Inchinnan / Glasgow Airport, Renfrewshire | 55.878, -4.428 | 55.8594, -4.4248 | 2.1 | inside | 2.1km from geocode |

## Place could not be geocoded (1)

- tv-nzt-power: "Teesworks, Redcar"

## Outside the region boundary by 10km or less (2)

Expected for some schemes, such as the Gigapark and the East Midlands Freeport airport site. Not corrected.

- wm-gigapark: 0.5km outside West Midlands
- em-freeport: 3.3km outside East Midlands

## Identical coordinates (0 groups)

These markers sit exactly on top of each other on the map. All remain reachable from the list.

None.

## All mapped schemes

| Scheme | Precision | Place | Entered (lat, lng) | Geocode (lat, lng) | Offset (km) | Outside region (km) | Flag |
|---|---|---|---|---|---|---|---|
| sy-airport-city | site | Finningley, Doncaster | 53.4805, -1.0106 | 53.4858, -0.9890 | 1.5 | inside |  |
| sy-investment-zone | area | Sheffield Business Park, Sheffield | 53.39, -1.39 | 53.3957, -1.3826 | 0.8 | inside |  |
| sy-compass | area | Sheffield Business Park | 53.396, -1.392 | 53.3957, -1.3826 | 0.6 | inside |  |
| sy-amp | site | Catcliffe, Rotherham | 53.3925, -1.382 | 53.3923, -1.3627 | 1.3 | inside |  |
| wm-bemdc | area | East Birmingham | 52.478, -1.865 | 52.4781, -1.8288 | 2.5 | inside |  |
| wm-sports-quarter | site | Bordesley Green, Birmingham | 52.475, -1.864 | 52.4759, -1.8512 | 0.9 | inside |  |
| wm-bkq | area | Aston University, Birmingham | 52.487, -1.886 | 52.4862, -1.8885 | 0.2 | inside |  |
| wm-gigapark | site | Coventry Airport, Baginton | 52.3697, -1.4797 | 52.3701, -1.4812 | 0.1 | 0.5 |  |
| wm-gic | area | Wolverhampton | 52.592, -2.118 | 52.5848, -2.1276 | 1.0 | inside |  |
| wm-coventry-station | site | Coventry station | 52.4007, -1.5135 | 52.4009, -1.5135 | 0.0 | inside |  |
| wm-mell-square | site | Mell Square, Solihull | 52.413, -1.779 | 52.4136, -1.7766 | 0.2 | inside |  |
| em-investment-zone | area | Infinity Park, Derby (lead site) | 52.882, -1.456 | 52.8760, -1.4664 | 1.0 | inside |  |
| em-freeport | area | East Midlands Airport | 52.8311, -1.3281 | 52.8281, -1.3327 | 0.5 | 3.3 |  |
| em-ratcliffe | site | Ratcliffe-on-Soar Power Station, Nottinghamshire | 52.864, -1.255 | 52.8614, -1.2555 | 0.3 | inside |  |
| em-step-fusion | site | West Burton, Bassetlaw | 53.36, -0.81 | 53.3590, -0.8008 | 0.6 | inside |  |
| em-trent-supercluster | area | Trent valley, Bassetlaw | 53.3, -0.78 | 53.3891, -0.8796 | 11.9 | inside |  |
| em-becketwell | site | Derby city centre | 52.9205, -1.48 | 52.9243, -1.4755 | 0.5 | inside |  |
| em-peak-resort | area | Unstone, Chesterfield (verify) | 53.29, -1.45 | 53.2837, -1.4274 | 1.7 | inside |  |
| em-team-derby | area | Derby | 52.9225, -1.4746 | 52.9142, -1.4720 | 0.9 | inside |  |
| em-alstom | site | Litchurch Lane, Derby | 52.907, -1.463 | 52.9079, -1.4613 | 0.2 | inside |  |
| wy-mass-transit | area | Leeds–Bradford | 53.8, -1.65 | 53.8667, -1.6568 | 7.4 | inside |  |
| wy-leeds-innovation-village | site | Leeds General Infirmary | 53.803, -1.556 | 53.8024, -1.5548 | 0.1 | inside |  |
| wy-nhic-huddersfield | area | Huddersfield | 53.651, -1.777 | 53.6467, -1.7822 | 0.6 | inside |  |
| wy-bradford-dhez | site | University of Bradford | 53.792, -1.764 | 53.7917, -1.7661 | 0.1 | inside |  |
| wy-ferrybridge | area | Ferrybridge, Wakefield | 53.71, -1.26 | 53.7107, -1.2752 | 1.0 | inside |  |
| wy-lba-parkway | area | Leeds Bradford Airport | 53.866, -1.66 | 53.8667, -1.6568 | 0.2 | inside |  |
| yny-york-central | site | York station | 53.96, -1.096 | 53.9590, -1.0941 | 0.2 | inside |  |
| yny-scarborough-mdz | area | Scarborough | 54.283, -0.4 | 54.2820, -0.4012 | 0.1 | inside |  |
| yny-selby-growth-zone | area | Selby | 53.784, -1.067 | 53.7840, -1.0688 | 0.1 | inside |  |
| yny-drax-ai | site | Drax Power Station | 53.736, -0.997 | 53.7381, -1.0001 | 0.3 | inside |  |
| yny-bioyorkshire | area | University of York | 53.948, -1.053 | 53.9454, -1.0315 | 1.4 | inside |  |
| tv-teesworks | site | Redcar | 54.605, -1.12 | 54.6179, -1.0688 | 3.6 | inside | 3.6km from geocode |
| tv-nzt-power | site | Teesworks, Redcar | 54.606, -1.155 | not found | n/a | inside |  |
| tv-freeport | area | South Bank, Middlesbrough | 54.585, -1.17 | 54.5759, -1.1867 | 1.5 | inside |  |
| tv-investment-zone | area | Middlesbrough | 54.574, -1.234 | 54.5760, -1.2344 | 0.2 | inside |  |
| tv-darlington-station | site | Darlington station | 54.52, -1.547 | 54.5216, -1.5466 | 0.2 | inside |  |
| ne-mdz-newcastle-gateshead | area | Quayside, Newcastle upon Tyne | 54.966, -1.608 | 54.9689, -1.6050 | 0.4 | inside |  |
| ne-forth-yards | site | Forth Banks, Newcastle upon Tyne | 54.966, -1.62 | 54.9657, -1.6165 | 0.2 | inside |  |
| ne-gateshead-quays | site | Gateshead Quayside | 54.968, -1.6 | 54.9686, -1.6065 | 0.4 | inside |  |
| ne-crown-works | site | Pallion, Sunderland | 54.91, -1.418 | 54.9127, -1.4179 | 0.3 | inside |  |
| ne-netpark | site | Sedgefield, County Durham | 54.653, -1.451 | 54.6532, -1.4497 | 0.1 | inside |  |
| ne-leamside | area | Leamside, County Durham | 54.85, -1.5 | 54.8142, -1.5169 | 4.1 | inside |  |
| gcr-amids | site | Inchinnan / Glasgow Airport, Renfrewshire | 55.878, -4.428 | 55.8594, -4.4248 | 2.1 | inside | 2.1km from geocode |
| gcr-clyde-mission | area | Broomielaw, Glasgow | 55.857, -4.28 | 55.8564, -4.2579 | 1.4 | inside |  |
| bel-gii | site | Titanic Quarter, Belfast | 54.608, -5.914 | 54.6050, -5.9109 | 0.4 | inside |  |
| bel-amic | area | Newtownabbey (verify) | 54.687, -5.96 | 54.6779, -5.9249 | 2.5 | inside |  |
| bel-ireach | area | Belfast (verify site) | 54.588, -5.94 | 54.5964, -5.9302 | 1.1 | inside |  |
| bel-belfast-stories | site | Royal Avenue, Belfast | 54.601, -5.93 | 54.6028, -5.9309 | 0.2 | inside |  |
| bel-city-centre | area | Belfast city centre | 54.597, -5.93 | 54.5931, -5.9313 | 0.4 | inside |  |
| ccr-investment-zone | area | Cardiff and Newport | 51.53, -3.08 | 51.4859, -3.1617 | 7.5 | inside |  |
| ccr-kla | site | Imperial Park, Newport | 51.553, -3.043 | 51.5517, -3.0371 | 0.4 | inside |  |
| ccr-csconnected | area | Newport | 51.549, -3.037 | 51.5719, -2.9752 | 5.0 | inside |  |
| ccr-metro-central | site | Cardiff Central | 51.476, -3.179 | 51.4755, -3.1797 | 0.1 | inside |  |
| ccr-northern-valleys | area | Heads of the Valleys | 51.72, -3.3 | 51.7543, -3.4456 | 10.7 | inside |  |
| ccr-aberthaw | site | Aberthaw, Vale of Glamorgan | 51.388, -3.405 | 51.3872, -3.4034 | 0.1 | inside |  |
| wm-smithfield | area | Smithfield, Birmingham | 52.4744, -1.8922 | 52.4744, -1.8922 | 0.0 | inside |  |
| wm-curzon-street | area | Curzon Street, Birmingham | 52.4827, -1.8825 | 52.4832, -1.8806 | 0.1 | inside |  |
| wm-central-heart | area | Martineau Place, Birmingham | 52.4803, -1.8952 | 52.4803, -1.8952 | 0.0 | inside |  |
| wm-digbeth | area | Custard Factory, Digbeth, Birmingham | 52.4754, -1.8846 | 52.4752, -1.8846 | 0.0 | inside |  |
| wm-arden-cross | area | Middle Bickenhill, Solihull | 52.4471, -1.7035 | 52.4471, -1.7035 | 0.0 | inside |  |
| wm-metro-sports-quarter | area | Adderley Park railway station | 52.4831, -1.8554 | 52.4831, -1.8554 | 0.0 | inside |  |
| wm-paradise | site | Paradise, Birmingham | 52.4792, -1.9052 | 52.4792, -1.9052 | 0.0 | inside |  |
| wm-ladywood | area | Ladywood, Birmingham | 52.477, -1.9278 | 52.4770, -1.9278 | 0.0 | inside |  |
| wm-tyseley | area | Tyseley railway station | 52.4539, -1.8386 | 52.4539, -1.8386 | 0.0 | inside |  |
| wm-city-centre-south | area | Bull Yard, Coventry | 52.4059, -1.5122 | 52.4059, -1.5122 | 0.0 | inside |  |
| wm-portersfield | site | Portersfield, Dudley | 52.5109, -2.0788 | 52.5109, -2.0788 | 0.0 | inside |  |
| wm-west-bromwich | area | West Bromwich Central tram stop | 52.5165, -1.9947 | 52.5165, -1.9947 | 0.0 | inside |  |
| wm-wolverhampton-city-centre | area | Wolverhampton railway station | 52.5875, -2.1203 | 52.5875, -2.1203 | 0.0 | inside |  |
| wm-m6-junction-10 | area | Bentley, Walsall | 52.5875, -2.0251 | 52.5875, -2.0251 | 0.0 | inside |  |
| wy-leeds-south-bank | area | Leeds Dock, Leeds | 53.7912, -1.5332 | 53.7912, -1.5332 | 0.0 | inside |  |
| wy-bradford-city-village | area | Oastler Shopping Centre, Bradford | 53.7964, -1.7577 | 53.7964, -1.7577 | 0.0 | inside |  |
| wy-wakefield-city-centre | area | Wakefield Cathedral | 53.683, -1.4968 | 53.6830, -1.4968 | 0.0 | inside |  |
| wy-calderdale-garden-communities | area | Clifton, Brighouse | 53.7122, -1.7777 | 53.7122, -1.7777 | 0.0 | inside |  |
