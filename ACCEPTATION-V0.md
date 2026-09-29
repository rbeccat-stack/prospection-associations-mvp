# Vérification de la V0 — 28 septembre 2026

Les fonctions sont implémentées. L'acceptation complète reste suspendue à une génération chez le fournisseur choisi et à la réception effective d'un e-mail personnel. Les tests de fournisseur utilisent des réponses simulées ; aucune transmission réelle par ces services n'a été effectuée.

| Critère du PRD | État et preuve |
| --- | --- |
| 1. Ciblage versionné | Test automatisé ; offre enregistrée dans une nouvelle version, anciens tests conservés. |
| 2. URL, CSV et saisie | Entrées et limites validées ; parcours d'ajout conservé. |
| 3. Source inaccessible | Erreur enregistrée ; réseau privé refusé. Lecture réelle d'Anciela par le collecteur et d'Artis depuis l'interface vérifiée. |
| 4. Fiche complète | Trois dossiers pilotes affichés. Génération IA réelle à vérifier après configuration. |
| 5. Preuves | Références validées, extraits contrôlés pour les sorties IA, sources dans la prévisualisation. La justesse sémantique reste à relire. |
| 6. Contacts | Contacts IA absents des textes rejetés par test. |
| 7. Brouillon éditable | Correction Artis enregistrée depuis le navigateur ; anciennes versions conservées et téléchargeables. |
| 8. Historique/doublons | Tests de doublons et profil figé ; états de collecte et livraison affichés. |
| 9. E-mail de test | Prévisualisation obligatoire, destinataire fixe, double clic et reprise testés avec transport simulé. SMTP réel à configurer. |
| 10. Correspondance | Le transport reçoit exactement le texte prévisualisé, vérifié par test. Réception réelle à confirmer. |
| 11. Erreurs/reprise | JSON invalide, référence ou contact inventé, interruption, conflit, prévisualisation périmée et envoi incertain traités. Erreurs brutes des fournisseurs non exposées. |
| 12. Périmètre | Routes d'envoi sans paramètre de destinataire ; configuration serveur unique. Aucune planification ni envoi aux associations. |

Vérification locale : TypeScript, tests et compilation de production. Collecte, sauvegarde et prévisualisation parcourues dans le navigateur. Voir `CONFIGURATION.md` pour l'activation.
