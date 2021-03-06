#!/usr/bin/env node --max-old-space-size=8192
/* jshint esnext:true */
// const glob = require('glob');
const fs = require('fs');
// const processTree = require('./3-processTree');
const jsonfile = require('jsonfile');
const readJson = require ('util').promisify(jsonfile.readFile);

let sources = require('./sources.json');
const cleanTree = require('./cleanTree');
// sources = 'melbourne ballarat'.split(' ').map(x => ({ id: x }));

//glob('out_*.geojson', {}, files => {
//    files.forEach(file => {

const identity = {
    scientific: 'scientific',
    common: 'common',
    species: 'species',
    genus: 'genus',
    variety: 'variety',
    description: 'description',
    dbh: 'dbh',
    crown: 'crown',
    height: 'height',
    maturity: 'maturity',
    health: 'health',
    structure: 'structure',
    location: 'location',
    ref: 'ref',
    planted: 'planted',
    updated: 'updated',
    ule: 'ule',
    ule_min: 'ule_min',
    ule_max: 'ule_max'

}
/* Given a GeoJSON feature, return a different one. */
function processTree(source, tree) {
    var src = tree.properties;
    
    var props = tree.properties = {
        source: source
    };
    // let identity = {};
    // Object.keys(src).forEach(p => identity[p] = p);

    const crosswalk = {
        ryde: {
            height: 'height',
        },
        melbourne: {
            ref: 'com_id',
            common: 'Common Name',
            scientific: 'Scientific Name',
            dbh: 'Diameter Breast Height',
            //planted: x => processDate(x['date planted']),
            planted: 'Date Planted',
            maturity: 'Age Description',
            ule_min: 'Useful Life Expectency',
            location: 'Located In'
        },
        southern_grampians: {
            ref: 'ref',
            scientific: 'species',
            common: 'common',
            location: 'location',
            height:'height',
            crown: 'crown',
            maturity:'maturity'
        }, colac_otways: {
            ref: 'tree_id',
            genus: 'genus_desc',
            species: 'spec_desc',
            scientific: x => `${x.genus_desc} ${x.spec_desc}`.trim(),
            common: 'common_nam',
            location: x => x.location_t.split(' ')[1],
            height: 'height_m',
            crown: 'canopy_wid',
            dbh: 'diam_breas',
            // planted: CASE WHEN length(year_plant::varchar) = 4 THEN to_date(year_plant::varchar, 'YYYY') END AS planted,
            maturity: 'life_stage'
        }, corangamite: {
            ref: 'id',
            height: 'height',
            crown: 'width',
            scientific: 'species',
            common: 'name',
            location: x => ({ 'STREET TREE': 'street', 'PARK TREE': 'park' }[x.tree_type] || '')
        }, manningham: {
            captured: 'date1',  // TODO YYYY-MM-DD
            ref: 'tree_no', // hansen_id?
            scientific: 'species', 
            height: 'height', 
            dbh: 'dbh'
        }, geelong: {
            ...identity, // requires Node 10
            scientific: x => x.genus + ' ' + (x.species || '').toLowerCase(),
            // TODO captured is a date

        }, adelaide: {
            ref: 'Asset Id (identifier)',
            dbh: x => x['Circum (Inspection)'] + ' circumference',
            health: 'Vigour (Inspection)',
            height: 'Height (Inspection)',
            structure: 'Structure (Inspection)',
            maturity: 'Age (Inspection)',
            scientific: 'Species Name (Inspection)',
            common: 'Common Name (Inspection)'
        }, waite_arboretum: {
            ref: 'tree_id',
            scientific: 'scientific',
            common: 'commonname',
            //planted: CASE WHEN length(yearplant::varchar) = 4 THEN to_date(yearplant::varchar, 'YYYY') END AS planted
        }, burnside: {
            ref: 'TreeID',
            common: 'CommonName',
            height: 'TreeHeight',
            scientific: 'BotanicalN',
            dbh: 'Circumfere' // TODO reconcile
        }, launceston: {
            ref: 'objectid',
            common: 'name',
            scientific: 'genusspeci',
            maturity: 'age',
            // planted: '', case when planteddat = '0' then NULL else planteddat::date end,
            dbh: 'diametr_c',
            height: 'height_m',
            crown: 'horizontal',
            health: 'vitality',
            captured: 'auditdate' // TODO date
        }, hobsons_bay: {
            genus: 'Genus',
            species: 'Species',
            dbh: 'DBH',
            tree_type: 'Type'
        }, glenelg: {
            ...identity
        }, perth: {
            ref: 'Tree_ID',
            common: 'Common_Nam',
            scientific: 'Botanical',
            family: 'Family',
            height: 'Height',
            health: 'Health',
            structure: 'Structure',
            maturity: 'Age_Class',
            //ule_ Life_Expec

        },
        shepparton: {
            ...identity
        }, brimbank: {
            ref: 'central_as',
            location: 'location',
            genus: 'genus',
            species: 'species',
            common: 'common_nam',
            maturity: 'age',
            height: 'height',
            crown: 'spread',
            // site_name, suburb...
        }, bendigo: {
            ref: 'assetid',
            description: 'desc',
            //type
            // genus: 'genus', // contains rubbish like "Eucalyptus M to Z" whereas scientific is clean.
            scientific: x => x.species.split(' - ')[0],
            common: x => x.species.split(' - ')[1],
            variety: x => x.cultivar !== 'Not Specified' ? x.cultivar : '',
            // house, st_name, st_type, st_suffix, suburb
        }, wyndham: {
            ref: 'tree_id',
            common: 'tree_commo',
            //tree_origin
            //inspection_date
            height: 'height',
            crown: 'canopy_wid',
            dbh: 'diameter_b',
            maturity: 'tree_age',
            health: 'health',
            ule: 'useful_lif',
            structure: 'structure'
        }, perth: {
            ref: 'tree_id',
            scientific: 'botanical',
            common: 'common_nam',
            family: 'family',
            height: 'height',
            dbh: 'dbh',
            crown: 'canopy_siz',
            maturity: 'age_class',
            ule: 'life_expec'
            //historical, rare_speci, canopy_den, est_age, prop_name, suburb, street_nam
        }, port_phillip: {
            ...identity
        }, prospect1: {
            species: 'Tree Species',
            maturity: 'Tree Age',
            dbh: x => x['Tree Circumference'] + ' circumference',
            health: 'Tree Health',
            structure: 'Tree Structure',
            height: 'Tree Height'
        }, prospect2: {
            species: 'Species Name',
        }, boroondara: {
            species: 'botanicaln',
            common: 'commonname',
            height: 'height',
            crown: 'canopyspre', // canopysp_1?
            health: 'health',
            description: 'significan',
            location: 'locality',
            dbh: x => x.girth + ' girth'
            // suburb, groupid, qty, girth, age, position, risktotree, hazardtopu, streetnr
        }, ryde: {
            height: 'Height' // sad, that's all there is.
        }, ballarat: {
            ...identity,
            genus: () => undefined, // contains same as species, this way it gets generated properly.
            scientific: 'species'
            // aohplaque, maintenance, description
        }
    
    }[source] || {};
    // TODO scrap all non-standard fields (esp lat, lon, ...)

    // TODO support standard datasets:
    /*
    ballarat

    */

    Object.keys(crosswalk).forEach(prop => {
        let val = (typeof crosswalk[prop] === 'function') ? crosswalk[prop](src) : src[crosswalk[prop]];
        if (val !== undefined) {
            tree.properties[prop] = val;
        }
    });
    delete(tree.lat);
    delete(tree.lon);
    return tree;
}

function countSpecies(tree) {
    if (tree.genus && tree.species) {
        speciesCount[tree.genus + ' ' + tree.species] = 1 + (speciesCount[tree.genus + ' ' + tree.species] || 0)
    }
}

function addSpeciesCount(tree) {
    if (tree.genus && tree.species) {
        tree.species_count = speciesCount[tree.genus + ' ' + tree.species];
    }
}

function showSpeciesCounts() {
    console.log(
        Object.keys(speciesCount)
        .sort((a, b) => speciesCount[b] - speciesCount[a])
        .slice(0, 20)
        .map(k => k + ': ' + speciesCount[k])
        .join('\n')
    );
}

console.log('Combining temporary files in tmp/out_* into processed tmp/allout.json');
let speciesCount = {}, outTrees = [];
let loads = sources.map(source => 
        readJson('tmp/out_' + source.id + '.geojson')
        .then(data => {
            console.log(source.id + ': ' + data.features.length);
            for (let tree of data.features) {
                tree = processTree(source.id, tree);
                if (tree.properties._del) {
                    break;
                }
                cleanTree(tree.properties);
                countSpecies(tree.properties);
                outTrees.push(tree);
            }
        }).catch(e => {
            console.error('Error loading ' + source.id);
            console.error(err);
        })
    );
Promise.all(loads).then(() => {
    const out = fs.createWriteStream('tmp/allout.json').on('error', console.error);
    process.stdout.write('Writing out: ');
    outTrees.forEach(tree => {
        // trees.forEach(tree => {
            addSpeciesCount(tree.properties);
            // if (!tree.properties._del) {
            out.write(JSON.stringify(tree) + '\n');
            // }
        // });
        // process.stdout.write('*');
    });
    console.log();
    showSpeciesCounts();
    console.log('\nDone.');
});