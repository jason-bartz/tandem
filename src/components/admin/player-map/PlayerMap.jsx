'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { countryCodeToFlag } from '@/lib/country-flag';
import { useTheme } from '@/contexts/ThemeContext';
import authService from '@/services/auth.service';

// Natural Earth 110m TopoJSON (hosted publicly by react-simple-maps)
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 numeric → alpha-2 mapping for matching TopoJSON IDs to our country codes
const NUMERIC_TO_ALPHA2 = {
  '004': 'AF', '008': 'AL', '012': 'DZ', '016': 'AS', '020': 'AD', '024': 'AO',
  '028': 'AG', '032': 'AR', '036': 'AU', '040': 'AT', '044': 'BS', '048': 'BH',
  '050': 'BD', '051': 'AM', '052': 'BB', '056': 'BE', '060': 'BM', '064': 'BT',
  '068': 'BO', '070': 'BA', '072': 'BW', '076': 'BR', '084': 'BZ', '090': 'SB',
  '092': 'VG', '096': 'BN', '100': 'BG', '104': 'MM', '108': 'BI', '112': 'BY',
  '116': 'KH', '120': 'CM', '124': 'CA', '132': 'CV', '140': 'CF', '144': 'LK',
  '148': 'TD', '152': 'CL', '156': 'CN', '158': 'TW', '170': 'CO', '174': 'KM',
  '175': 'YT', '178': 'CG', '180': 'CD', '184': 'CK', '188': 'CR', '191': 'HR',
  '192': 'CU', '196': 'CY', '203': 'CZ', '204': 'BJ', '208': 'DK', '212': 'DM',
  '214': 'DO', '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET', '232': 'ER',
  '233': 'EE', '234': 'FO', '238': 'FK', '242': 'FJ', '246': 'FI', '250': 'FR',
  '254': 'GF', '258': 'PF', '262': 'DJ', '266': 'GA', '268': 'GE', '270': 'GM',
  '275': 'PS', '276': 'DE', '288': 'GH', '296': 'KI', '300': 'GR', '304': 'GL',
  '308': 'GD', '312': 'GP', '316': 'GU', '320': 'GT', '324': 'GN', '328': 'GY',
  '332': 'HT', '336': 'VA', '340': 'HN', '344': 'HK', '348': 'HU', '352': 'IS',
  '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE', '376': 'IL',
  '380': 'IT', '384': 'CI', '388': 'JM', '392': 'JP', '398': 'KZ', '400': 'JO',
  '404': 'KE', '408': 'KP', '410': 'KR', '414': 'KW', '417': 'KG', '418': 'LA',
  '422': 'LB', '426': 'LS', '428': 'LV', '430': 'LR', '434': 'LY', '438': 'LI',
  '440': 'LT', '442': 'LU', '446': 'MO', '450': 'MG', '454': 'MW', '458': 'MY',
  '462': 'MV', '466': 'ML', '470': 'MT', '474': 'MQ', '478': 'MR', '480': 'MU',
  '484': 'MX', '492': 'MC', '496': 'MN', '498': 'MD', '499': 'ME', '500': 'MS',
  '504': 'MA', '508': 'MZ', '512': 'OM', '516': 'NA', '520': 'NR', '524': 'NP',
  '528': 'NL', '531': 'CW', '533': 'AW', '534': 'SX', '540': 'NC', '548': 'VU',
  '554': 'NZ', '558': 'NI', '562': 'NE', '566': 'NG', '570': 'NU', '574': 'NF',
  '578': 'NO', '580': 'MP', '583': 'FM', '584': 'MH', '585': 'PW', '586': 'PK',
  '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE', '608': 'PH', '612': 'PN',
  '616': 'PL', '620': 'PT', '624': 'GW', '626': 'TL', '630': 'PR', '634': 'QA',
  '638': 'RE', '642': 'RO', '643': 'RU', '646': 'RW', '652': 'BL', '654': 'SH',
  '659': 'KN', '660': 'AI', '662': 'LC', '663': 'MF', '666': 'PM', '670': 'VC',
  '674': 'SM', '678': 'ST', '682': 'SA', '686': 'SN', '688': 'RS', '690': 'SC',
  '694': 'SL', '702': 'SG', '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO',
  '710': 'ZA', '716': 'ZW', '724': 'ES', '728': 'SS', '729': 'SD', '732': 'EH',
  '740': 'SR', '744': 'SJ', '748': 'SZ', '752': 'SE', '756': 'CH', '760': 'SY',
  '762': 'TJ', '764': 'TH', '768': 'TG', '772': 'TK', '776': 'TO', '780': 'TT',
  '784': 'AE', '788': 'TN', '792': 'TR', '795': 'TM', '796': 'TC', '798': 'TV',
  '800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB', '831': 'GG',
  '832': 'JE', '833': 'IM', '834': 'TZ', '840': 'US', '850': 'VI', '854': 'BF',
  '858': 'UY', '860': 'UZ', '862': 'VE', '876': 'WF', '882': 'WS', '887': 'YE',
  '894': 'ZM',
};

// Approximate centroid coordinates for placing flag markers
const COUNTRY_CENTROIDS = {
  AF: [67, 33], AL: [20, 41], DZ: [3, 28], AO: [18, -12], AR: [-64, -34],
  AU: [134, -25], AT: [14, 47.5], BD: [90, 24], BE: [4.5, 50.8], BO: [-65, -17],
  BR: [-53, -10], BG: [25, 43], CA: [-96, 56], CL: [-71, -30], CN: [105, 35],
  CO: [-74, 4], HR: [16, 45.5], CU: [-79, 22], CZ: [15, 49.8], DK: [10, 56],
  DO: [-70, 19], EC: [-78, -2], EG: [30, 27], SV: [-89, 14], ET: [40, 9],
  FI: [26, 64], FR: [2, 46], DE: [10, 51], GH: [-1.5, 8], GR: [22, 39],
  GT: [-90.5, 15.5], HN: [-87, 14.5], HK: [114, 22.3], HU: [19.5, 47],
  IS: [-19, 65], IN: [79, 22], ID: [120, -2], IR: [53, 32], IQ: [44, 33],
  IE: [-8, 53.5], IL: [35, 31.5], IT: [12, 43], JM: [-77.5, 18.2], JP: [138, 36],
  JO: [36.5, 31], KZ: [67, 48], KE: [38, 1], KR: [128, 36], KW: [48, 29.5],
  LB: [35.8, 34], LY: [17, 27], LT: [24, 55.5], LU: [6.1, 49.8], MY: [110, 4],
  MX: [-102, 23], MA: [-6, 32], MZ: [35, -18], MM: [96, 20], NP: [84, 28],
  NL: [5.5, 52.5], NZ: [172, -41], NG: [8, 10], NO: [10, 62], PK: [70, 30],
  PA: [-80, 9], PY: [-58, -23], PE: [-76, -10], PH: [122, 13], PL: [19, 52],
  PT: [-8, 39.5], QA: [51.5, 25.5], RO: [25, 46], RU: [100, 60], SA: [45, 24],
  SN: [-14, 14.5], RS: [21, 44], SG: [104, 1.3], SK: [19.5, 48.7], SI: [15, 46.1],
  ZA: [25, -29], ES: [-4, 40], SE: [16, 62], CH: [8, 47], TW: [121, 24],
  TH: [101, 15], TN: [9, 34], TR: [35, 39], UA: [32, 49], AE: [54, 24],
  GB: [-2, 54], US: [-98, 39], UY: [-56, -33], UZ: [64, 41], VE: [-67, 8],
  VN: [106, 16], ZW: [30, -20], TZ: [35, -6], UG: [32, 1.5], KH: [105, 13],
  LK: [81, 8], CR: [-84, 10], PR: [-66.5, 18.2],
  TT: [-61, 10.5], BS: [-77, 25], BB: [-59.5, 13.2], GY: [-59, 5],
  SR: [-56, 4], BZ: [-88.5, 17.2], NI: [-85, 13], HT: [-72, 19], CY: [33, 35],
  GE: [44, 42], AM: [45, 40], AZ: [49, 40.5], BA: [18, 44], MK: [21.5, 41.5],
  ME: [19.3, 42.7], EE: [25, 59], LV: [24.5, 57], MD: [29, 47], BY: [28, 54],
  KG: [75, 41.5], TJ: [69, 39], TM: [59, 39], MN: [104, 47], LA: [103, 18],
  BN: [115, 4.5], PG: [147, -6], FJ: [178, -18], WS: [-172, -14],
  SB: [160, -9], TO: [-175, -21], BT: [90, 27.5], MV: [73, 3.2],
  MT: [14.4, 35.9], BH: [50.5, 26], DJ: [43, 11.5], ER: [39, 15.5],
  GM: [-15.5, 13.5], GW: [-15, 12], KM: [44, -12], LS: [29, -29.5],
  LR: [-10, 6.5], MW: [34, -13.5], ML: [-4, 17], MR: [-11, 20.5],
  NE: [8, 17], NA: [18, -22], CD: [24, -3], CG: [16, -1], CF: [21, 7],
  CM: [12, 6], GA: [11.5, -0.7], GN: [-12, 11], CI: [-5.5, 7.5],
  BF: [-2, 12.5], TD: [19, 15], RW: [30, -2], BI: [30, -3.5], SC: [55.5, -4.7],
  ST: [7, 0.3], SL: [-12, 8.5], TG: [1, 8.5], BJ: [2.3, 9.5], SZ: [31.5, -26.5],
  SS: [30, 7], SD: [30, 16], SO: [46, 5], KP: [127, 40], PS: [35.2, 31.9],
  SY: [38, 35], LI: [9.5, 47.2], SM: [12.4, 43.9], AD: [1.5, 42.5],
  MC: [7.4, 43.7], VA: [12.5, 41.9], IM: [-4.5, 54.2],
};

export default function PlayerMap() {
  const { reduceMotion } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const shimmer = reduceMotion ? '' : 'skeleton-shimmer';

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = await authService.getAuthHeaders(true);
        const res = await fetch('/api/admin/player-map', { headers });
        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || 'Failed to load');
        }
      } catch {
        setError('Failed to load map data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build lookup: country_code → { flag }
  const countryLookup = useMemo(() => {
    if (!data?.countries) return {};
    const map = {};
    for (const c of data.countries) {
      map[c.code] = c;
    }
    return map;
  }, [data]);

  // Get alpha-2 from TopoJSON geography ID
  function getAlpha2(geo) {
    const id = geo.id || geo.properties?.['ISO_A2'];
    if (NUMERIC_TO_ALPHA2[id]) return NUMERIC_TO_ALPHA2[id];
    const padded = String(id).padStart(3, '0');
    if (NUMERIC_TO_ALPHA2[padded]) return NUMERIC_TO_ALPHA2[padded];
    const a2 = geo.properties?.['ISO_A2'];
    if (a2 && a2 !== '-99') return a2;
    return null;
  }

  function getCountryFill(geo) {
    const code = getAlpha2(geo);
    if (!code || !countryLookup[code]) return 'var(--border-color)';
    return 'var(--accent-blue)';
  }

  function handleMouseMove(e) {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className={`${shimmer} h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded`} />
        <div className={`${shimmer} h-[350px] bg-gray-200 dark:bg-gray-700 rounded-lg`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg p-4 text-center">
        <p className="text-accent-red font-semibold text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">
          Player Map
          <span className="ml-2 text-text-secondary font-normal">
            {data.totalCountries} {data.totalCountries === 1 ? 'country' : 'countries'}
          </span>
        </h3>
      </div>

      {/* Map */}
      <div
        className="rounded-lg relative overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130, center: [0, 30] }}
          style={{ width: '100%', height: 'auto' }}
          viewBox="0 0 800 450"
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const code = getAlpha2(geo);
                  const countryData = code ? countryLookup[code] : null;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getCountryFill(geo)}
                      stroke="var(--border-color)"
                      strokeWidth={0.5}
                      onMouseEnter={() => {
                        if (countryData) {
                          setHoveredCountry({
                            name: geo.properties.name,
                            flag: countryData.flag,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredCountry(null)}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: countryData ? 'var(--primary-hover)' : 'var(--border-color)',
                          outline: 'none',
                          cursor: countryData ? 'pointer' : 'default',
                        },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Flag markers on countries with players */}
            {data.countries.map((country) => {
              const coords = COUNTRY_CENTROIDS[country.code];
              if (!coords) return null;
              return (
                <Marker key={country.code} coordinates={coords}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    style={{ pointerEvents: 'none' }}
                  >
                    {country.flag || countryCodeToFlag(country.code)}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {hoveredCountry && (
          <div
            className="fixed z-50 pointer-events-none bg-text-primary text-ghost-white px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              left: tooltipPos.x + 12,
              top: tooltipPos.y - 40,
            }}
          >
            <span className="mr-1.5">{hoveredCountry.flag}</span>
            {hoveredCountry.name}
          </div>
        )}
      </div>
    </div>
  );
}
