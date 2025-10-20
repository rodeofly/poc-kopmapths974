# poc-kopmapths974
# Rapport d'Analyse de Projet : FlashCards-Maths974 et PoC Hybride

Ce rapport analyse la phase de *Proof of Concept* (PoC) visant à intégrer un moteur de génération d'exercices mathématiques dans l'application existante de Répétition Espacée (SRS). Il se concentre sur les objectifs fonctionnels, l'architecture d'interface utilisateur et la description détaillée de l'algorithme pédagogique, conformément à vos exigences.

***

## 1. Vision et Objectifs Stratégiques

| Domaine | Objectif Fonctionnel | Impact Utilisateur |
| :--- | :--- | :--- |
| **Fiabilité** | Remplacer les contenus statiques par des exercices dynamiques générés à la volée. | L'utilisateur rencontre toujours de nouvelles variations d'exercices, renforçant l'apprentissage et l'empêchant de mémoriser les réponses. |
| **Objectivité du Score** | Passer de l'auto-évaluation subjective à une **évaluation automatique** par l'application pour les exercices compatibles (formules, choix multiples). | Le score d'apprentissage est plus fiable, optimisant la planification de révision du Système de Répétition Espacée (SRS). |
| **Flexibilité** | Créer une architecture capable de gérer tout type d'exercice généré par le moteur (saisie de formule, choix multiples, etc.). | L'application peut prendre en charge l'ensemble du catalogue du moteur de génération sans nécessiter de développement d'interface spécifique. |

***

## 2. Logique Pédagogique : Algorithme de Répétition Espacée (SRS)

L'application utilise un algorithme adaptatif inspiré du modèle **SuperMemo-2 (SM-2)** pour calculer la date optimale de révision de chaque carte/exercice. Le système prend en entrée la **Qualité de la Réponse** (un score de 1 à 4) pour mettre à jour l'état de l'élément (statut, intervalle, facteur de facilité).

### Évaluation de la Qualité de la Réponse

L'algorithme est alimenté par un score de Qualité (Q), qui est maintenant déterminé de deux manières :
1.  **Automatique (pour les exercices auto-évaluables)** : Une réponse objectivement correcte est traduite en une Qualité élevée (souvent 4), et une réponse incorrecte est traduite en une Qualité basse (souvent 1).
2.  **Manuelle (pour les exercices statiques)** : L'utilisateur clique sur l'un des quatre boutons du SRS.

| Score de Qualité (Q) | Libellé | Conséquence sur l'Apprentissage |
| :---: | :--- | :--- |
| **1** | À revoir (Oublié) | Remise à zéro de la progression. |
| **2** | Difficile | Progression ralentie. |
| **3** | Correct | Progression normale. |
| **4** | Facile | Augmentation maximale de l'espacement. |

### Calcul de la Nouvelle Progression

Le moteur SRS met à jour trois propriétés clés pour chaque carte : le statut, l'intervalle et le facteur de facilité.

#### A. Mise à Jour du Statut et de l'Intervalle Initial

* **Si la Qualité est inférieure à 2 (Q=1) :**
    * L'élément revient au statut **"apprentissage"**.
    * L'intervalle de révision est réinitialisé à **1 jour**.
* **Si l'élément est en statut "apprentissage" ou "nouvelle" (Q ≥ 2) :**
    * L'élément passe au statut **"révision"**.
    * L'intervalle initial est défini : **1 jour** (Q=2), **3 jours** (Q=3), ou **5 jours** (Q=4).

#### B. Mise à Jour du Facteur de Facilité (Pour les éléments en "révision")

Le **Facteur de Facilité** (`facteur_facilite`) détermine la rapidité avec laquelle l'intervalle augmentera. Plus le score est élevé, plus l'élément est jugé facile à retenir, et plus l'espacement sera grand.

Le calcul utilise la formule SM-2 :
$$EF_{n} = \max(1.3, EF_{o} + (0.1 - (5 - Q) \cdot (0.08 + (5 - Q) \cdot 0.02)))$$
où $EF_{o}$ est l'ancien facteur de facilité et $Q$ est le score de qualité (2, 3 ou 4).

#### C. Calcul du Nouvel Intervalle

Le nouvel intervalle de révision est calculé en multipliant l'ancien intervalle par le nouveau Facteur de Facilité :
$$I_{n} = \lceil I_{o} \cdot EF_{n} \rceil$$
où $I_{o}$ est l'ancien intervalle.

Enfin, la **Prochaine Date de Révision** est calculée en ajoutant l'Intervalle ($I_n$) au jour actuel.

***

## 3. Architecture du Contenu et de l'Interface

Le PoC valide une architecture modulaire robuste qui sépare clairement les préoccupations :

* **Persistance de la Progression :** La progression de chaque carte (Statut, Intervalle, Facteur de Facilité) est stockée localement par un module d'état dédié, utilisant une structure par clé unique pour éviter les collisions entre les différents jeux de cartes (decks).
* **Stockage des Données :** Seules les données de progression sont stockées localement; le contenu Question/Réponse de chaque exercice est chargé à partir du bundle principal ou du manifeste.
* **Contrôle de Flux (PoC Hybride) :** Le PoC établit un contrôle de navigation clair où l'utilisateur ne peut passer à l'exercice suivant qu'après avoir validé sa réponse (automatiquement ou manuellement). Le bouton principal se transforme en **"Suivant"** après la validation pour gérer le rythme de la session.
