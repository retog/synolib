interface Justification {
  toString: () => string;
  precedingSynonym?: JustifiedSynonym; // eslint-disable-line no-use-before-define
}

export type MaterialCitation = {
  "catalogNumber": string;
  "collectionCode"?: string;
  "typeStatus"?: string;
  "countryCode"?: string;
  "stateProvince"?: string;
  "municipality"?: string;
  "county"?: string;
  "locality"?: string;
  "verbatimLocality"?: string;
  "recordedBy"?: string;
  "eventDate"?: string;
  "samplingProtocol"?: string;
  "decimalLatitude"?: string;
  "decimalLongitude"?: string;
  "verbatimElevation"?: string;
}

export type Treatment = {
  url: string;
  materialCitations: Promise<MaterialCitation[]>;
  date?: number;
  creators?: string;
};

interface TreatmentJustification extends Justification {
  treatment: Treatment;
}

type LexicalJustification = Justification;

export type anyJustification = (TreatmentJustification | LexicalJustification);

export type anySyncJustification = {
  toString: () => string;
  precedingSynonym?: JustifiedSynonym; // eslint-disable-line no-use-before-define
  treatment?: Treatment;
};

export class JustificationSet implements AsyncIterable<anyJustification> {
  private monitor = new EventTarget();
  contents: anyJustification[] = [];
  isFinished = false;
  isAborted = false;
  entries = ((Array.from(this.contents.values()).map((v) => [v, v])) as [
    anyJustification,
    anyJustification,
  ][]).values;

  constructor(iterable?: Iterable<anyJustification>) {
    if (iterable) {
      for (const el of iterable) {
        this.add(el);
      }
    }
    return this;
  }

  get size() {
    return new Promise<number>((resolve, reject) => {
      if (this.isAborted) {
        reject(new Error("JustificationSet has been aborted"));
      } else if (this.isFinished) {
        resolve(this.contents.length);
      } else {
        const listener = () => {
          if (this.isFinished) {
            this.monitor.removeEventListener("updated", listener);
            resolve(this.contents.length);
          }
        };
        this.monitor.addEventListener("updated", listener);
      }
    });
  }

  add(value: anyJustification) {
    if (
      this.contents.findIndex((c) => c.toString() === value.toString()) === -1
    ) {
      this.contents.push(value);
      this.monitor.dispatchEvent(new CustomEvent("updated"));
    }
    return this;
  }

  finish() {
    //console.info("%cJustificationSet finished", "color: #69F0AE;");
    this.isFinished = true;
    this.monitor.dispatchEvent(new CustomEvent("updated"));
  }

  forEachCurrent(cb: (val: anyJustification) => void) {
    this.contents.forEach(cb);
  }

  first() {
    return new Promise<anyJustification>((resolve) => {
      if (this.contents[0]) {
        resolve(this.contents[0]);
      } else {
        this.monitor.addEventListener("update", () => {
          resolve(this.contents[0]);
        });
      }
    });
  }

  [Symbol.toStringTag] = "";
  [Symbol.asyncIterator]() {
    this.monitor.addEventListener("updated", () => console.log("ARA"));
    let returnedSoFar = 0;
    return {
      next: () => {
        return new Promise<IteratorResult<anyJustification>>(
          (resolve, reject) => {
            const _ = () => {
              if (this.isAborted) {
                reject(new Error("JustificationSet has been aborted"));
              } else if (returnedSoFar < this.contents.length) {
                resolve({ value: this.contents[returnedSoFar++] });
              } else if (this.isFinished) {
                resolve({ done: true, value: true });
              } else {
                const listener = () => {
                  console.log("ahgfd");
                  this.monitor.removeEventListener("updated", listener);
                  _();
                };
                this.monitor.addEventListener("updated", listener);
              }
            };
            _();
          },
        );
      },
    };
  }
}

class TreatmentSet implements AsyncIterable<Treatment> {
  private monitor = new EventTarget();
  contents: Treatment[] = [];
  isFinished = false;
  isAborted = false;

  constructor(iterable?: Iterable<Treatment>) {
    if (iterable) {
      for (const el of iterable) {
        this.add(el);
      }
    }
    return this;
  }

  get size() {
    return new Promise<number>((resolve, reject) => {
      if (this.isAborted) {
        reject(new Error("JustificationSet has been aborted"));
      } else if (this.isFinished) {
        resolve(this.contents.length);
      } else {
        const listener = () => {
          if (this.isFinished) {
            this.monitor.removeEventListener("updated", listener);
            resolve(this.contents.length);
          }
        };
        this.monitor.addEventListener("updated", listener);
      }
    });
  }

  add(value: Treatment) {
    if (this.contents.findIndex((c) => c.url === value.url) === -1) {
      this.contents.push(value);
      this.monitor.dispatchEvent(new CustomEvent("updated"));
    }
    return this;
  }

  finish() {
    //console.info("%cTreatmentSet finished", "color: #B9F6CA;");
    this.isFinished = true;
    this.monitor.dispatchEvent(new CustomEvent("updated"));
  }

  [Symbol.asyncIterator]() {
    let returnedSoFar = 0;
    return {
      next: () => {
        return new Promise<IteratorResult<Treatment>>((resolve, reject) => {
          const _ = () => {
            /*console.log(
              this.isFinished,
              this.isAborted,
              returnedSoFar,
              "<",
              this.contents.length,
            );*/
            if (this.isAborted) {
              reject(new Error("TreatmentSet has been aborted"));
            } else if (returnedSoFar < this.contents.length) {
              resolve({ value: this.contents[returnedSoFar++] });
            } else if (this.isFinished) {
              //console.info("%cTreatmentSet finished 22", "color: #B9F6CA;");
              resolve({ done: true, value: true });
            } else {
              const listener = () => {
                this.monitor.removeEventListener("updated", listener);
                _();
              };
              this.monitor.addEventListener("updated", listener);
            }
          };
          _();
        });
      },
    };
  }
}

type Treatments = {
  def: TreatmentSet;
  aug: TreatmentSet;
  dpr: TreatmentSet;
};

export type JustifiedSynonym = {
  taxonConceptUri: string;
  taxonNameUri: string;
  justifications: JustificationSet;
  treatments: Treatments;
  loading: boolean;
};

export class SparqlEndpoint {
  constructor(private sparqlEnpointUri: string) {
  }
  async getSparqlResultSet(
    query: string,
    fetchOptions: { headers?: Record<string, string> } = {},
  ) {
    fetchOptions.headers = fetchOptions.headers || {};
    fetchOptions.headers["Accept"] = "application/sparql-results+json";
    const response = await fetch(
      this.sparqlEnpointUri + "?query=" + encodeURIComponent(query),
      fetchOptions,
    );
    return await response.json();
  }
}

type SparqlJson = {
  head: {
    vars: string[];
  };
  results: {
    bindings: { [key: string]: { type: string; value: string } }[];
  };
};

export default class SynonymGroup implements AsyncIterable<JustifiedSynonym> {
  justifiedArray: JustifiedSynonym[] = [];
  monitor = new EventTarget();
  isFinished = false;
  isAborted = false;

  constructor(
    sparqlEndpoint: SparqlEndpoint,
    taxonName: string,
    ignoreRank = false,
  ) {
    /** Maps from taxonConceptUris to their synonyms */
    const justifiedSynonyms: Map<string, number> = new Map();
    const expandedTaxonNames: Set<string> = new Set();

    const resolver = (value: JustifiedSynonym | true) => {
      if (value === true) {
        //console.info("%cSynogroup finished", "color: #00E676;");
        this.isFinished = true;
      }
      this.monitor.dispatchEvent(new CustomEvent("updated"));
    };

    const build = async () => {
      function getStartingPoints(
        taxonName: string,
      ): Promise<JustifiedSynonym[]> {
        const [genus, species, subspecies] = taxonName.split(" ");
        // subspecies could also be variety
        // ignoreRank has no effect when there is a 'subspecies', as this is assumed to be the lowest rank & should thus not be able to return results in another rank
        const query = `PREFIX dwc: <http://rs.tdwg.org/dwc/terms/>
    PREFIX treat: <http://plazi.org/vocab/treatment#>
    SELECT DISTINCT ?tn ?tc WHERE {
      ?tc dwc:genus "${genus}";
          treat:hasTaxonName ?tn;
          ${species ? `dwc:species "${species}";` : ""}
          ${subspecies ? `(dwc:subspecies|dwc:variety) "${subspecies}";` : ""}
          ${
          ignoreRank || !!subspecies
            ? ""
            : `dwc:rank "${species ? "species" : "genus"}";`
        }
          a <http://filteredpush.org/ontologies/oa/dwcFP#TaxonConcept>.
    }`;
        // console.info('%cREQ', 'background: red; font-weight: bold; color: white;', `getStartingPoints('${taxonName}')`)
        return sparqlEndpoint.getSparqlResultSet(query)
          .then((json: SparqlJson) =>
            json.results.bindings.map((t) => {
              return {
                taxonConceptUri: t.tc.value,
                taxonNameUri: t.tn.value,
                justifications: new JustificationSet([
                  `matches "${genus}${species ? " " + species : ""}${
                    subspecies ? " " + subspecies : ""
                  }"`,
                ]),
                treatments: {
                  def: new TreatmentSet(),
                  aug: new TreatmentSet(),
                  dpr: new TreatmentSet(),
                },
                loading: true,
              };
            })
          );
      }

      const synonymFinders = [
        /** Get the Synonyms having the same {taxon-name} */
        (taxon: JustifiedSynonym): Promise<JustifiedSynonym[]> => {
          const query = `PREFIX dc: <http://purl.org/dc/elements/1.1/>
    PREFIX treat: <http://plazi.org/vocab/treatment#>
    SELECT DISTINCT
    ?tc
    WHERE {
      ?tc treat:hasTaxonName <${taxon.taxonNameUri}> .
      FILTER (?tc != <${taxon.taxonConceptUri}>)
    }`;
          // console.info('%cREQ', 'background: red; font-weight: bold; color: white;', `synonymFinder[0]( ${taxon.taxonConceptUri} )`)
          // Check wether we already expanded this taxon name horizontally - otherwise add
          if (expandedTaxonNames.has(taxon.taxonNameUri)) {
            return Promise.resolve([]);
          }
          expandedTaxonNames.add(taxon.taxonNameUri);
          return sparqlEndpoint.getSparqlResultSet(query).then((
            json: SparqlJson,
          ) =>
            json.results.bindings.filter((t) => t.tc).map((t) => {
              return {
                taxonConceptUri: t.tc.value,
                taxonNameUri: taxon.taxonNameUri,
                justifications: new JustificationSet([{
                  toString: () =>
                    `${t.tc.value} has taxon name ${taxon.taxonNameUri}`,
                  precedingSynonym: taxon,
                }]),
                treatments: {
                  def: new TreatmentSet(),
                  aug: new TreatmentSet(),
                  dpr: new TreatmentSet(),
                },
                loading: true,
              };
            })
          );
        },
        /** Get the Synonyms deprecating {taxon} */
        (taxon: JustifiedSynonym): Promise<JustifiedSynonym[]> => {
          const query = `PREFIX dc: <http://purl.org/dc/elements/1.1/>
    PREFIX treat: <http://plazi.org/vocab/treatment#>
    SELECT DISTINCT
    ?tc ?tn ?treat ?date (group_concat(DISTINCT ?creator;separator="; ") as ?creators)
    WHERE {
      ?treat treat:deprecates <${taxon.taxonConceptUri}> ;
            (treat:augmentsTaxonConcept|treat:definesTaxonConcept) ?tc ;
            dc:creator ?creator .
      ?tc <http://plazi.org/vocab/treatment#hasTaxonName> ?tn .
      OPTIONAL {
        ?treat treat:publishedIn ?publ .
        ?publ dc:date ?date .
      }
    }
    GROUP BY ?tc ?tn ?treat ?date`;
          // console.info('%cREQ', 'background: red; font-weight: bold; color: white;', `synonymFinder[1]( ${taxon.taxonConceptUri} )`)
          return sparqlEndpoint.getSparqlResultSet(query).then((
            json: SparqlJson,
          ) =>
            json.results.bindings.filter((t) => t.tc).map((t) => {
              return {
                taxonConceptUri: t.tc.value,
                taxonNameUri: t.tn.value,
                justifications: new JustificationSet([{
                  toString: () =>
                    `${t.tc.value} deprecates ${taxon.taxonConceptUri} according to ${t.treat.value}`,
                  precedingSynonym: taxon,
                  treatment: {
                    url: t.treat.value,
                    creators: t.creators.value,
                    date: t.date ? parseInt(t.date.value, 10) : undefined,
                    materialCitations: getMaterialCitations(t.treat.value),
                  },
                }]),
                treatments: {
                  def: new TreatmentSet(),
                  aug: new TreatmentSet(),
                  dpr: new TreatmentSet(),
                },
                loading: true,
              };
            })
          );
        },
        /** Get the Synonyms deprecated by {taxon} */
        (taxon: JustifiedSynonym): Promise<JustifiedSynonym[]> => {
          const query = `PREFIX dc: <http://purl.org/dc/elements/1.1/>
    PREFIX treat: <http://plazi.org/vocab/treatment#>
    SELECT DISTINCT
    ?tc ?tn ?treat ?date (group_concat(DISTINCT ?creator;separator="; ") as ?creators)
    WHERE {
      ?treat (treat:augmentsTaxonConcept|treat:definesTaxonConcept) <${taxon.taxonConceptUri}> ;
            treat:deprecates ?tc ;
            dc:creator ?creator .
      ?tc <http://plazi.org/vocab/treatment#hasTaxonName> ?tn .
      OPTIONAL {
        ?treat treat:publishedIn ?publ .
        ?publ dc:date ?date .
      }
    }
    GROUP BY ?tc ?tn ?treat ?date`;
          // console.info('%cREQ', 'background: red; font-weight: bold; color: white;', `synonymFinder[2]( ${taxon.taxonConceptUri} )`)
          return sparqlEndpoint.getSparqlResultSet(query).then((
            json: SparqlJson,
          ) =>
            json.results.bindings.filter((t) => t.tc).map((t) => {
              return {
                taxonConceptUri: t.tc.value,
                taxonNameUri: t.tn.value,
                justifications: new JustificationSet([{
                  toString: () =>
                    `${t.tc.value} deprecated by ${taxon.taxonConceptUri} according to ${t.treat.value}`,
                  precedingSynonym: taxon,
                  treatment: {
                    url: t.treat.value,
                    creators: t.creators.value,
                    date: t.date ? parseInt(t.date.value, 10) : undefined,
                    materialCitations: getMaterialCitations(t.treat.value),
                  },
                }]),
                treatments: {
                  def: new TreatmentSet(),
                  aug: new TreatmentSet(),
                  dpr: new TreatmentSet(),
                },
                loading: true,
              };
            })
          );
        },
      ];

      async function lookUpRound(
        taxon: JustifiedSynonym,
      ): Promise<JustifiedSynonym[]> {
        // await new Promise(resolve => setTimeout(resolve, 3000)) // 3 sec
        // console.log('%cSYG', 'background: blue; font-weight: bold; color: white;', `lookupRound( ${taxon.taxonConceptUri} )`)
        const foundGroupsP = synonymFinders.map((finder) => finder(taxon));
        const foundGroups = await Promise.all(foundGroupsP);
        return foundGroups.reduce((a, b) => a.concat(b), []);
      }

      function getTreatments(
        uri: string,
        treatments: Treatments,
      ): Promise<void> {
        const treat = "http://plazi.org/vocab/treatment#";
        const query = `PREFIX treat: <${treat}>
    PREFIX dc: <http://purl.org/dc/elements/1.1/>
    PREFIX dwc: <http://rs.tdwg.org/dwc/terms/>
    SELECT DISTINCT ?treat ?how ?date (group_concat(DISTINCT ?c;separator="; ") as ?creators)
    WHERE {
      ?treat (treat:definesTaxonConcept|treat:augmentsTaxonConcept|treat:deprecates) <${uri}> ;
              ?how <${uri}> ;
              dc:creator ?c .
      OPTIONAL {
        ?treat treat:publishedIn ?pub .
        ?pub dc:date ?date .
      }
    }
    GROUP BY ?treat ?how ?date`;
        // console.info('%cREQ', 'background: red; font-weight: bold; color: white;', `getTreatments('${uri}')`)
        return sparqlEndpoint.getSparqlResultSet(query).then(
          (json: SparqlJson) => {
            json.results.bindings.forEach((t) => {
              if (!t.treat) return;
              const treatment: Treatment = {
                url: t.treat.value,
                date: parseInt(t.date?.value, 10),
                creators: t.creators.value,
                materialCitations: getMaterialCitations(t.treat.value)
              };
              switch (t.how.value) {
                case treat + "definesTaxonConcept":
                  treatments.def.add(treatment);
                  break;
                case treat + "augmentsTaxonConcept":
                  treatments.aug.add(treatment);
                  break;
                case treat + "deprecates":
                  treatments.dpr.add(treatment);
                  break;
              }
            });
          },
        );
      }

      function getMaterialCitations(uri: string): Promise<MaterialCitation[]> {
        const query = `
    PREFIX dwc: <http://rs.tdwg.org/dwc/terms/>
    SELECT DISTINCT *
    WHERE {
      <${uri}> dwc:basisOfRecord ?mc .
      ?mc dwc:catalogNumber ?catalogNumber .
      OPTIONAL { ?mc dwc:collectionCode ?collectionCode . }
      OPTIONAL { ?mc dwc:typeStatus ?typeStatus . }
      OPTIONAL { ?mc dwc:countryCode ?countryCode . }
      OPTIONAL { ?mc dwc:stateProvince ?stateProvince . }
      OPTIONAL { ?mc dwc:municipality ?municipality . }
      OPTIONAL { ?mc dwc:county ?county . }
      OPTIONAL { ?mc dwc:locality ?locality . }
      OPTIONAL { ?mc dwc:verbatimLocality ?verbatimLocality . }
      OPTIONAL { ?mc dwc:recordedBy ?recordedBy . }
      OPTIONAL { ?mc dwc:eventDate ?eventDate . }
      OPTIONAL { ?mc dwc:samplingProtocol ?samplingProtocol . }
      OPTIONAL { ?mc dwc:decimalLatitude ?decimalLatitude . }
      OPTIONAL { ?mc dwc:decimalLongitude ?decimalLongitude . }
      OPTIONAL { ?mc dwc:verbatimElevation ?verbatimElevation . }
    }`;
        return sparqlEndpoint.getSparqlResultSet(query).then(
          (json: SparqlJson) => {
            const resultArray: MaterialCitation[] = []
            json.results.bindings.forEach((t) => {
              if (!t.mc || !t.catalogNumber) return;
              const result = {
                "catalogNumber": t.catalogNumber.value,
                "collectionCode": t.collectionCode?.value || undefined,
                "typeStatus": t.typeStatus?.value || undefined,
                "countryCode": t.countryCode?.value || undefined,
                "stateProvince": t.stateProvince?.value || undefined,
                "municipality": t.municipality?.value || undefined,
                "county": t.county?.value || undefined,
                "locality": t.locality?.value || undefined,
                "verbatimLocality": t.verbatimLocality?.value || undefined,
                "recordedBy": t.recordedBy?.value || undefined,
                "eventDate": t.eventDate?.value || undefined,
                "samplingProtocol": t.samplingProtocol?.value || undefined,
                "decimalLatitude": t.decimalLatitude?.value || undefined,
                "decimalLongitude": t.decimalLongitude?.value || undefined,
                "verbatimElevation": t.verbatimElevation?.value || undefined,
              }
              resultArray.push(result)
            })
            return resultArray;
          })
      }

      const finish = (justsyn: JustifiedSynonym) => {
        justsyn.justifications.finish();
        getTreatments(justsyn.taxonConceptUri, justsyn.treatments).then(() => {
          justsyn.treatments.def.finish();
          justsyn.treatments.aug.finish();
          justsyn.treatments.dpr.finish();
          justsyn.loading = false;
        });
      };

      let justifiedSynsToExpand: JustifiedSynonym[] = await getStartingPoints(
        taxonName,
      );
      await justifiedSynsToExpand.forEach((justsyn) => {
        finish(justsyn);
        justifiedSynonyms.set(
          justsyn.taxonConceptUri,
          this.justifiedArray.push(justsyn) - 1,
        );
        resolver(justsyn);
      });
      const expandedTaxonConcepts: string[] = [];
      while (justifiedSynsToExpand.length > 0) {
        const foundThisRound: string[] = [];
        const promises = justifiedSynsToExpand.map((j, index) =>
          lookUpRound(j).then((newSynonyms) => {
            newSynonyms.forEach((justsyn) => {
              // Check whether we know about this synonym already
              if (justifiedSynonyms.has(justsyn.taxonConceptUri)) {
                // Check if we found that synonym in this round
                if (~foundThisRound.indexOf(justsyn.taxonConceptUri)) {
                  justsyn.justifications.forEachCurrent((jsj) => {
                    this
                      .justifiedArray[
                        justifiedSynonyms.get(justsyn.taxonConceptUri)!
                      ].justifications.add(jsj);
                  });
                }
              } else {
                finish(justsyn);
                justifiedSynonyms.set(
                  justsyn.taxonConceptUri,
                  this.justifiedArray.push(justsyn) - 1,
                );
                resolver(justsyn);
              }
              if (!~expandedTaxonConcepts.indexOf(justsyn.taxonConceptUri)) {
                justifiedSynsToExpand.push(justsyn);
                foundThisRound.push(justsyn.taxonConceptUri);
              }
            });
            expandedTaxonConcepts.push(j.taxonConceptUri);
            return true;
          })
        );
        justifiedSynsToExpand = [];
        await Promise.allSettled(promises);
      }
      resolver(true);
    };

    build();
  }

  abort() {
    this.isAborted = true;
  }

  [Symbol.asyncIterator]() {
    let returnedSoFar = 0;
    return {
      next: () => {
        return new Promise<IteratorResult<JustifiedSynonym>>(
          (resolve, reject) => {
            const _ = () => {
              if (this.isAborted) {
                reject(new Error("SynyonymGroup has been aborted"));
              } else if (returnedSoFar < this.justifiedArray.length) {
                resolve({ value: this.justifiedArray[returnedSoFar++] });
              } else if (this.isFinished) {
                resolve({ done: true, value: true });
              } else {
                const listener = () => {
                  this.monitor.removeEventListener("updated", listener);
                  _();
                };
                this.monitor.addEventListener("updated", listener);
              }
            };
            _();
          },
        );
      },
    };
  }
}
