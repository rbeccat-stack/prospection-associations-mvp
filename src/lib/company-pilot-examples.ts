import { emptyCompany, type Company } from "./company-records";

// Short editorial summaries, checked on the linked official pages on 2026-11-04.
// These are optional pilot cases, not a recommendation to contact these companies.
export const enrichmentExamples: Company[] = [
  { ...emptyCompany, id: "siren-901931105", siren: "901931105", name: "Muodim", sector: "Deeptech · muographie", city: "Lyon (à actualiser dans Sirene)", source: "",
    description: "Imagerie par muographie de structures opaques ou inaccessibles.",
    signal: "Le site présente des applications en génie civil, industrie et géosciences. L’identité du site n’a pas été recoupée avec des mentions légales lors du pilote.",
    idea: "Hypothèse : concevoir une page pédagogique pour un cas d’usage et un public précis. Première preuve possible : un schéma de parcours et un plan de mesure. Vérifier l’intérêt auprès de l’entreprise.",
    sources: [{ id: "pilot-muodim", label: "Muodim — activité et applications", url: "https://muodim.com/", consultedOn: "2026-11-04" }],
  },
  { ...emptyCompany, id: "siren-791513989", siren: "791513989", name: "ReCom", sector: "Services · prospection B2B", city: "Lyon 3e (mentions légales)", source: "",
    description: "Agence de prospection commerciale B2B et de prise de rendez-vous qualifiés.",
    signal: "Le site décrit une prospection multicanale et un cas client James Hardie ciblant des façadiers. Le SIRET publié dans les mentions commence par 791513989.",
    idea: "Hypothèse : préparer un mini-cas de segmentation de prescripteurs et un protocole de qualification. Première preuve possible : une grille de critères et un suivi des résultats sur des données de démonstration. Besoin à confirmer.",
    sources: [{ id: "pilot-recom", label: "ReCom — offres et cas clients", url: "https://www.re-com.fr/", consultedOn: "2026-11-04" }, { id: "pilot-recom-legal", label: "ReCom — mentions légales", url: "https://www.re-com.fr/mentions-legales", consultedOn: "2026-11-04" }],
  },
  { ...emptyCompany, id: "siren-304453160", siren: "304453160", name: "Locabri", sector: "Industrie · bâtiments démontables", city: "Brignais (mentions légales)", source: "",
    description: "Conception et fabrication de bâtiments démontables, en acier et métallo-textiles.",
    signal: "Le site présente des produits pour les besoins industriels et des réalisations. Les mentions légales indiquent le numéro 304 453 160 au registre du commerce de Lyon.",
    idea: "Hypothèse : relier un cas d’usage sectoriel au parcours de demande de devis. Première preuve possible : une maquette de page et un plan de mesure des demandes qualifiées. Vérifier les priorités internes avant toute proposition.",
    sources: [{ id: "pilot-locabri", label: "Locabri — produits et réalisations", url: "https://www.locabri.com/fr/", consultedOn: "2026-11-04" }, { id: "pilot-locabri-legal", label: "Locabri — mentions légales", url: "https://www.locabri.com/fr/mentions-legales", consultedOn: "2026-11-04" }],
  },
];
