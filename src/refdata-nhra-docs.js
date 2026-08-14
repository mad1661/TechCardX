// Structured NHRA tech data parsed from official documents supplied by
// the tech department (Class Guide & Specifications changelog through
// 2026-08-10, and Chrysler 1964/1965/1968 engine blueprint spec sheets).
// Regenerate by re-running the doc parser on newer documents, or merge
// fresh entries via the website updater / dataset import.

export const hpAdjustments = [
  {
    "date": "2026-02-16",
    "make": "Mopar",
    "yearFrom": 1966,
    "yearTo": 1967,
    "cui": 273,
    "advHp": 180,
    "factoredFrom": 177,
    "factoredTo": 166,
    "note": ""
  },
  {
    "date": "2026-03-17",
    "make": "Dodge",
    "yearFrom": 2015,
    "yearTo": 2015,
    "cui": 354,
    "advHp": 540,
    "factoredFrom": 540,
    "factoredTo": 549,
    "note": ""
  },
  {
    "date": "2026-03-31",
    "make": "Chev",
    "yearFrom": 1986,
    "yearTo": 1986,
    "cui": 305,
    "advHp": 190,
    "factoredFrom": 197,
    "factoredTo": 199,
    "note": ""
  },
  {
    "date": "2026-03-31",
    "make": "Chev",
    "yearFrom": 1969,
    "yearTo": 1969,
    "cui": 396,
    "advHp": 375,
    "factoredFrom": 405,
    "factoredTo": 409,
    "note": ""
  },
  {
    "date": "2026-03-31",
    "make": "GM",
    "yearFrom": 1988,
    "yearTo": 1989,
    "cui": 350,
    "advHp": 230,
    "factoredFrom": 264,
    "factoredTo": 266,
    "note": ""
  },
  {
    "date": "2026-06-30",
    "make": "Chev",
    "yearFrom": 1969,
    "yearTo": 1969,
    "cui": 350,
    "advHp": 300,
    "factoredFrom": 291,
    "factoredTo": 293,
    "note": ""
  },
  {
    "date": "2026-06-30",
    "make": "Chev",
    "yearFrom": 1969,
    "yearTo": 1969,
    "cui": 350,
    "advHp": 300,
    "factoredFrom": 293,
    "factoredTo": 294,
    "note": ""
  },
  {
    "date": "2026-07-21",
    "make": "Mopar",
    "yearFrom": 1965,
    "yearTo": 1965,
    "cui": 426,
    "advHp": 425,
    "factoredFrom": 450,
    "factoredTo": 454,
    "note": "stock"
  }
];

export const guideNotices = [
  {
    "date": "2026-02-16",
    "area": "Class Guide",
    "text": "Mopar 64-91 273added alternate supercharger case for Factory Stock"
  },
  {
    "date": "2026-02-16",
    "area": "Class Guide",
    "text": "Mopar 64-91 273-360 added replacement cylinder head"
  },
  {
    "date": "2026-02-16",
    "area": "Class Guide",
    "text": "Mopar 66-67 273 180 corrected engine family number"
  },
  {
    "date": "2026-02-25",
    "area": "Class Guide",
    "text": "Dodge 2026 Charger Drag Pak added"
  },
  {
    "date": "2026-02-25",
    "area": "Class Guide",
    "text": "Chry added 2026 354 675"
  },
  {
    "date": "2026-04-07",
    "area": "Blue Print Specs",
    "text": "Chry 09-10 345/305 Added alternate manifold spacer"
  },
  {
    "date": "2026-04-07",
    "area": "Blue Print Specs",
    "text": "Chry 09-10 370/385 Added alternate manifold spacer"
  },
  {
    "date": "2026-04-07",
    "area": "Blue Print Specs",
    "text": "Chry 2010 392/375 Added alternate manifold spacer"
  },
  {
    "date": "2026-06-30",
    "area": "Blue Print Specs",
    "text": "Ford 1986 140/84 Added carburetor specifications"
  },
  {
    "date": "2026-07-07",
    "area": "Blue Print Specs",
    "text": "Chev 2023 632/575 Corrected combustion chamber specification"
  },
  {
    "date": "2026-07-21",
    "area": "Blue Print Specs",
    "text": "Mopar 64-65 426/425 added alternate manifold"
  },
  {
    "date": "2026-08-05",
    "area": "Blue Print Specs",
    "text": "AMC 68-69 390/315 added alternate rod length"
  },
  {
    "date": "2026-08-06",
    "area": "Blue Print Specs",
    "text": "Mopar 63-69 383/280 - 335 added alternate intake manifold"
  },
  {
    "date": "2026-08-10",
    "area": "Blue Print Specs",
    "text": "Mopar 64-65 426/400, 425 added carburetor information"
  },
  {
    "date": "2026-08-10",
    "area": "Blue Print Specs",
    "text": "Mopar 1968 426/425 added carburetor information"
  }
];

export const engineSpecs = { Mopar: {
  "1964": {
    "displacements": [
      {
        "cui": 170,
        "bore": 3.406,
        "stroke": 3.125,
        "cyl": 6,
        "rod": 5.71,
        "note": ""
      },
      {
        "cui": 225,
        "bore": 3.406,
        "stroke": 4.126,
        "cyl": 6,
        "rod": 6.7,
        "note": ""
      },
      {
        "cui": 273,
        "bore": 3.63,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 318,
        "bore": 3.91,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 361,
        "bore": 4.125,
        "stroke": 3.38,
        "cyl": 8,
        "rod": 6.36,
        "note": ""
      },
      {
        "cui": 383,
        "bore": 4.25,
        "stroke": 3.375,
        "cyl": 8,
        "rod": 6.36,
        "note": ""
      },
      {
        "cui": 413,
        "bore": 4.188,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.77,
        "note": ""
      },
      {
        "cui": 426,
        "bore": 4.25,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.77,
        "note": "Wedge"
      },
      {
        "cui": 426,
        "bore": 4.25,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.861,
        "note": "Hemi"
      }
    ],
    "combos": [
      {
        "advHp": 101,
        "cui": 170,
        "mfg": "D",
        "cr": 8.5
      },
      {
        "advHp": 101,
        "cui": 170,
        "mfg": "P",
        "cr": 8.5
      },
      {
        "advHp": 145,
        "cui": 225,
        "mfg": "D",
        "cr": 8.4
      },
      {
        "advHp": 145,
        "cui": 225,
        "mfg": "P",
        "cr": 8.4
      },
      {
        "advHp": 180,
        "cui": 273,
        "mfg": "DP",
        "cr": 8.8
      },
      {
        "advHp": 230,
        "cui": 318,
        "mfg": "DP",
        "cr": 9.0
      },
      {
        "advHp": 265,
        "cui": 361,
        "mfg": "C",
        "cr": 9.0
      },
      {
        "advHp": 265,
        "cui": 361,
        "mfg": "D",
        "cr": 9.0
      },
      {
        "advHp": 265,
        "cui": 361,
        "mfg": "P",
        "cr": 9.0
      },
      {
        "advHp": 305,
        "cui": 383,
        "mfg": "C",
        "cr": 10.0
      },
      {
        "advHp": 305,
        "cui": 383,
        "mfg": "D",
        "cr": 10.0
      },
      {
        "advHp": 330,
        "cui": 383,
        "mfg": "DP",
        "cr": 10.0
      },
      {
        "advHp": 340,
        "cui": 413,
        "mfg": "C",
        "cr": 10.0
      },
      {
        "advHp": 360,
        "cui": 413,
        "mfg": "C",
        "cr": 10.0
      },
      {
        "advHp": 360,
        "cui": 413,
        "mfg": "D",
        "cr": 10.0
      },
      {
        "advHp": 365,
        "cui": 426,
        "mfg": "DP",
        "cr": 10.3
      },
      {
        "advHp": 390,
        "cui": 413,
        "mfg": "C",
        "cr": 9.6
      },
      {
        "advHp": 400,
        "cui": 426,
        "mfg": "DP",
        "cr": 12.5
      },
      {
        "advHp": 415,
        "cui": 426,
        "mfg": "DP",
        "cr": 11.0
      },
      {
        "advHp": 425,
        "cui": 426,
        "mfg": "DP",
        "cr": 12.5
      },
      {
        "advHp": 425,
        "cui": 426,
        "mfg": "DP",
        "cr": 12.5
      }
    ]
  },
  "1965": {
    "displacements": [
      {
        "cui": 170,
        "bore": 3.406,
        "stroke": 3.125,
        "cyl": 6,
        "rod": 5.71,
        "note": ""
      },
      {
        "cui": 225,
        "bore": 3.406,
        "stroke": 4.126,
        "cyl": 6,
        "rod": 6.7,
        "note": ""
      },
      {
        "cui": 273,
        "bore": 3.63,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 318,
        "bore": 3.91,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 361,
        "bore": 4.125,
        "stroke": 3.38,
        "cyl": 8,
        "rod": 6.36,
        "note": ""
      },
      {
        "cui": 383,
        "bore": 4.25,
        "stroke": 3.375,
        "cyl": 8,
        "rod": 6.36,
        "note": ""
      },
      {
        "cui": 413,
        "bore": 4.188,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.77,
        "note": ""
      },
      {
        "cui": 426,
        "bore": 4.25,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.77,
        "note": "Wedge"
      },
      {
        "cui": 426,
        "bore": 4.25,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.861,
        "note": "Hemi"
      }
    ],
    "combos": [
      {
        "advHp": 101,
        "cui": 170,
        "mfg": "D",
        "cr": 8.5
      },
      {
        "advHp": 101,
        "cui": 170,
        "mfg": "P",
        "cr": 8.5
      },
      {
        "advHp": 145,
        "cui": 225,
        "mfg": "D",
        "cr": 8.4
      },
      {
        "advHp": 145,
        "cui": 225,
        "mfg": "P",
        "cr": 8.4
      },
      {
        "advHp": 180,
        "cui": 273,
        "mfg": "DP",
        "cr": 8.8
      },
      {
        "advHp": 230,
        "cui": 318,
        "mfg": "DP",
        "cr": 9.0
      },
      {
        "advHp": 235,
        "cui": 273,
        "mfg": "DP",
        "cr": 10.5
      },
      {
        "advHp": 265,
        "cui": 361,
        "mfg": "DP",
        "cr": 9.0
      },
      {
        "advHp": 270,
        "cui": 383,
        "mfg": "C",
        "cr": 9.2
      },
      {
        "advHp": 270,
        "cui": 383,
        "mfg": "DP",
        "cr": 9.2
      },
      {
        "advHp": 315,
        "cui": 383,
        "mfg": "C",
        "cr": 10.0
      },
      {
        "advHp": 330,
        "cui": 383,
        "mfg": "P",
        "cr": 10.0
      },
      {
        "advHp": 340,
        "cui": 413,
        "mfg": "C",
        "cr": 10.1
      },
      {
        "advHp": 340,
        "cui": 413,
        "mfg": "D",
        "cr": 10.1
      },
      {
        "advHp": 360,
        "cui": 413,
        "mfg": "CD",
        "cr": 10.1
      },
      {
        "advHp": 365,
        "cui": 426,
        "mfg": "DP",
        "cr": 10.3
      },
      {
        "advHp": 400,
        "cui": 426,
        "mfg": "DP",
        "cr": 12.5
      },
      {
        "advHp": 425,
        "cui": 426,
        "mfg": "DP",
        "cr": 12.5
      }
    ]
  },
  "1968": {
    "displacements": [
      {
        "cui": 170,
        "bore": 3.406,
        "stroke": 3.125,
        "cyl": 6,
        "rod": 5.71,
        "note": ""
      },
      {
        "cui": 225,
        "bore": 3.406,
        "stroke": 4.126,
        "cyl": 6,
        "rod": 6.7,
        "note": ""
      },
      {
        "cui": 273,
        "bore": 3.63,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 318,
        "bore": 3.91,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 340,
        "bore": 4.04,
        "stroke": 3.313,
        "cyl": 8,
        "rod": 6.123,
        "note": ""
      },
      {
        "cui": 383,
        "bore": 4.25,
        "stroke": 3.375,
        "cyl": 8,
        "rod": 6.36,
        "note": ""
      },
      {
        "cui": 426,
        "bore": 4.25,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.861,
        "note": "Hemi"
      },
      {
        "cui": 440,
        "bore": 4.32,
        "stroke": 3.75,
        "cyl": 8,
        "rod": 6.77,
        "note": ""
      }
    ],
    "combos": [
      {
        "advHp": 115,
        "cui": 170,
        "mfg": "D",
        "cr": 8.5
      },
      {
        "advHp": 115,
        "cui": 170,
        "mfg": "P",
        "cr": 8.5
      },
      {
        "advHp": 145,
        "cui": 225,
        "mfg": "D",
        "cr": 8.4
      },
      {
        "advHp": 145,
        "cui": 225,
        "mfg": "P",
        "cr": 8.4
      },
      {
        "advHp": 190,
        "cui": 273,
        "mfg": "DP",
        "cr": 9.0
      },
      {
        "advHp": 230,
        "cui": 318,
        "mfg": "DP",
        "cr": 9.0
      },
      {
        "advHp": 275,
        "cui": 340,
        "mfg": "DP",
        "cr": 10.5
      },
      {
        "advHp": 290,
        "cui": 383,
        "mfg": "CD",
        "cr": 9.2
      },
      {
        "advHp": 300,
        "cui": 383,
        "mfg": "DP",
        "cr": 10.0
      },
      {
        "advHp": 330,
        "cui": 383,
        "mfg": "C",
        "cr": 10.0
      },
      {
        "advHp": 330,
        "cui": 383,
        "mfg": "DP",
        "cr": 10.0
      },
      {
        "advHp": 335,
        "cui": 383,
        "mfg": "DP",
        "cr": 10.0
      },
      {
        "advHp": 350,
        "cui": 440,
        "mfg": "CDP",
        "cr": 10.1
      },
      {
        "advHp": 375,
        "cui": 440,
        "mfg": "CDP",
        "cr": 10.1
      },
      {
        "advHp": 425,
        "cui": 426,
        "mfg": "DP",
        "cr": 10.25
      },
      {
        "advHp": 425,
        "cui": 426,
        "mfg": "DP",
        "cr": 13.5
      }
    ]
  }
} };
