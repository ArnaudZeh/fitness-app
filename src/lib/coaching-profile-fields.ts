import type { CoachingProfileInput } from '@/lib/coaching-profile-api'

export type CoachingFieldType = 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'date' | 'time'

export interface CoachingFieldOption {
  value: string
  label: string
}

export interface CoachingFieldDef {
  key: keyof CoachingProfileInput
  label: string
  type: CoachingFieldType
  options?: CoachingFieldOption[]
  step?: number
  min?: number
  max?: number
  helperText?: string
}

export interface CoachingCategoryDef {
  id: string
  title: string
  description?: string
  defaultExpanded?: boolean
  fields: CoachingFieldDef[]
}

// Groupé pour refléter ce qu'un coach sportif demanderait à un nouveau
// client — voir project_coaching_profile_initiative (mémoire). Les 4
// catégories jugées prioritaires (santé/sécurité, objectifs, logistique)
// démarrent dépliées ; les autres sont repliées pour ne pas noyer la page.
export const COACHING_CATEGORIES: CoachingCategoryDef[] = [
  {
    id: 'objectifs',
    title: 'Objectifs & motivation',
    defaultExpanded: true,
    fields: [
      { key: 'secondary_goals', label: 'Objectifs secondaires', type: 'textarea' },
      {
        key: 'goal_horizon',
        label: 'Échéance visée',
        type: 'select',
        options: [
          { value: 'aucune', label: 'Aucune échéance précise' },
          { value: '3_mois', label: '3 mois' },
          { value: '6_mois', label: '6 mois' },
          { value: '1_an', label: '1 an' },
        ],
      },
      {
        key: 'target_event',
        label: 'Événement cible (mariage, compétition…)',
        type: 'text',
      },
      { key: 'motivation_why', label: 'Pourquoi maintenant ?', type: 'textarea' },
      {
        key: 'past_attempts',
        label: 'Ce qui a déjà été essayé, et pourquoi ça n’a pas tenu',
        type: 'textarea',
      },
      { key: 'success_definition', label: 'À quoi ressemblerait la réussite ?', type: 'textarea' },
    ],
  },
  {
    id: 'antecedents_medicaux',
    title: 'Antécédents médicaux',
    description: 'Sécurité avant tout — rien n’est partagé, jamais visible par des amis.',
    defaultExpanded: true,
    fields: [
      { key: 'diagnosed_conditions', label: 'Pathologies diagnostiquées', type: 'textarea' },
      { key: 'current_medications', label: 'Traitements en cours', type: 'textarea' },
      { key: 'past_surgeries', label: 'Chirurgies passées', type: 'textarea' },
      { key: 'family_medical_history', label: 'Antécédents familiaux significatifs', type: 'textarea' },
      { key: 'medical_followup', label: 'Suivi médical actuel', type: 'text' },
      { key: 'last_checkup_date', label: 'Dernier bilan / check-up', type: 'date' },
      {
        key: 'pregnancy_status',
        label: 'Grossesse',
        type: 'select',
        options: [
          { value: 'non', label: 'Non' },
          { value: 'enceinte', label: 'Enceinte' },
          { value: 'post_partum', label: 'Post-partum' },
        ],
      },
      {
        key: 'medical_clearance',
        label: 'Feu vert médical pour l’exercice obtenu',
        type: 'boolean',
        helperText: 'Pertinent si tu es suivi·e pour une pathologie lourde.',
      },
    ],
  },
  {
    id: 'blessures',
    title: 'Blessures & limitations physiques',
    defaultExpanded: true,
    fields: [
      { key: 'current_injuries', label: 'Blessures actuelles', type: 'textarea' },
      { key: 'chronic_injuries', label: 'Blessures anciennes / chroniques', type: 'textarea' },
      { key: 'recurring_pain', label: 'Douleurs récurrentes à l’effort', type: 'textarea' },
      {
        key: 'contraindicated_movements',
        label: 'Mouvements déconseillés par un pro de santé',
        type: 'textarea',
      },
      { key: 'physio_osteo_followup', label: 'Suivi kiné / ostéo en cours', type: 'text' },
    ],
  },
  {
    id: 'experience',
    title: 'Expérience sportive',
    fields: [
      {
        key: 'fitness_level',
        label: 'Niveau global',
        type: 'select',
        options: [
          { value: 'debutant', label: 'Débutant' },
          { value: 'intermediaire', label: 'Intermédiaire' },
          { value: 'avance', label: 'Avancé' },
          { value: 'athlete', label: 'Athlète confirmé' },
        ],
      },
      { key: 'years_training', label: 'Années de pratique structurée', type: 'number', step: 0.5, min: 0 },
      { key: 'current_sports', label: 'Sport(s) pratiqué(s) actuellement', type: 'text' },
      { key: 'past_sports', label: 'Sport(s) pratiqué(s) dans le passé', type: 'text' },
      { key: 'competitive_background', label: 'Antécédents compétitifs', type: 'textarea' },
      { key: 'key_lift_prs', label: 'Records connus (squat, développé, soulevé de terre…)', type: 'textarea' },
      { key: 'favorite_exercises', label: 'Exercices préférés', type: 'textarea' },
      { key: 'disliked_exercises', label: 'Exercices détestés', type: 'textarea' },
      { key: 'body_focus_preference', label: 'Zones du corps à privilégier ou éviter', type: 'textarea' },
      { key: 'prior_coaching_experience', label: 'Expérience de coaching précédente', type: 'textarea' },
    ],
  },
  {
    id: 'nutrition',
    title: 'Nutrition & habitudes alimentaires',
    fields: [
      {
        key: 'diet_type',
        label: 'Type d’alimentation',
        type: 'select',
        options: [
          { value: 'omnivore', label: 'Omnivore' },
          { value: 'vegetarien', label: 'Végétarien' },
          { value: 'vegan', label: 'Végan' },
          { value: 'pescetarien', label: 'Pescétarien' },
          { value: 'cetogene', label: 'Cétogène' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      { key: 'meals_per_day', label: 'Nombre de repas par jour', type: 'number', min: 1, max: 10 },
      { key: 'snacking_habits', label: 'Grignotage (fréquence, déclencheurs)', type: 'textarea' },
      { key: 'cooking_habits', label: 'Cuisine maison / plats préparés / restaurant', type: 'text' },
      { key: 'food_budget_monthly', label: 'Budget alimentaire mensuel (€)', type: 'number', step: 10, min: 0 },
      { key: 'favorite_foods', label: 'Aliments préférés', type: 'textarea' },
      { key: 'disliked_foods', label: 'Aliments détestés / refusés', type: 'textarea' },
      { key: 'food_allergies', label: 'Allergies alimentaires', type: 'textarea' },
      { key: 'food_intolerances', label: 'Intolérances (lactose, gluten…)', type: 'textarea' },
      { key: 'daily_water_intake_l', label: 'Eau bue par jour (L)', type: 'number', step: 0.1, min: 0 },
      {
        key: 'eating_disorder_history',
        label: 'Historique de troubles du comportement alimentaire',
        type: 'textarea',
        helperText: 'Optionnel et sensible — à remplir seulement si tu es à l’aise, ça aide à adapter les recommandations en toute sécurité.',
      },
      { key: 'macro_tracking_experience', label: 'Expérience du tracking de calories/macros', type: 'text' },
      { key: 'estimated_daily_calories', label: 'Apport calorique quotidien estimé', type: 'number', min: 0 },
    ],
  },
  {
    id: 'complements',
    title: 'Compléments alimentaires',
    fields: [
      { key: 'current_supplements', label: 'Compléments pris actuellement', type: 'textarea' },
      { key: 'past_supplements', label: 'Compléments déjà essayés et abandonnés', type: 'textarea' },
      { key: 'supplement_budget_monthly', label: 'Budget mensuel dédié (€)', type: 'number', step: 5, min: 0 },
      { key: 'supplement_preferences', label: 'Préférences (végan, sans lactose…)', type: 'textarea' },
      { key: 'supplement_reluctances', label: 'Réticences personnelles', type: 'textarea' },
    ],
  },
  {
    id: 'sommeil',
    title: 'Sommeil',
    fields: [
      { key: 'avg_sleep_hours', label: 'Heures de sommeil moyennes par nuit', type: 'number', step: 0.5, min: 0 },
      { key: 'sleep_quality', label: 'Qualité perçue', type: 'text' },
      { key: 'bedtime', label: 'Heure de coucher habituelle', type: 'time' },
      { key: 'wake_time', label: 'Heure de lever habituelle', type: 'time' },
      { key: 'sleep_disorders', label: 'Troubles du sommeil connus', type: 'text' },
      { key: 'screens_before_bed', label: 'Écrans avant de dormir', type: 'boolean' },
    ],
  },
  {
    id: 'stress_mode_vie',
    title: 'Stress & mode de vie',
    fields: [
      { key: 'stress_level', label: 'Niveau de stress perçu (1-10)', type: 'number', min: 1, max: 10 },
      { key: 'stress_sources', label: 'Sources principales de stress', type: 'textarea' },
      { key: 'occupation_type', label: 'Métier / type de travail', type: 'text' },
      { key: 'daily_sitting_hours', label: 'Heures assises par jour', type: 'number', step: 0.5, min: 0 },
      { key: 'avg_daily_steps', label: 'Pas quotidiens moyens', type: 'number', min: 0 },
      { key: 'family_context', label: 'Charge familiale (enfants, aidant·e…)', type: 'textarea' },
      { key: 'travel_frequency', label: 'Fréquence des déplacements/voyages', type: 'text' },
    ],
  },
  {
    id: 'consommation',
    title: 'Consommation',
    fields: [
      { key: 'smoking_status', label: 'Tabac', type: 'text' },
      { key: 'alcohol_consumption', label: 'Alcool (fréquence, quantité)', type: 'text' },
      { key: 'caffeine_intake', label: 'Caféine (quantité, dernière prise)', type: 'text' },
    ],
  },
  {
    id: 'logistique',
    title: 'Logistique d’entraînement',
    defaultExpanded: true,
    fields: [
      { key: 'training_location', label: 'Lieu(x) d’entraînement', type: 'text' },
      { key: 'home_equipment', label: 'Équipement disponible à la maison', type: 'textarea' },
      { key: 'gym_access_details', label: 'Accès salle (horaires, matériel, affluence)', type: 'textarea' },
      { key: 'available_days_times', label: 'Jours et créneaux réellement disponibles', type: 'textarea' },
      { key: 'session_duration_preference_min', label: 'Durée de séance souhaitée (min)', type: 'number', min: 1 },
      { key: 'training_alone_or_group', label: 'Seul·e, avec coach, ou en groupe', type: 'text' },
      { key: 'travel_constraints', label: 'Contraintes de déplacement', type: 'text' },
    ],
  },
  {
    id: 'hormonal',
    title: 'Spécificités hormonales',
    description: 'Le suivi du cycle menstruel se fait dans "Module cycles" plus bas sur le profil.',
    fields: [
      { key: 'contraception_method', label: 'Contraception utilisée', type: 'text' },
      { key: 'menopause_status', label: 'Périménopause / ménopause', type: 'text' },
    ],
  },
  {
    id: 'psychologie',
    title: 'Psychologie & adhérence',
    fields: [
      { key: 'past_dropout_reasons', label: 'Raisons d’abandon de programmes passés', type: 'textarea' },
      { key: 'adherence_motivators', label: 'Ce qui aide à tenir dans la durée', type: 'textarea' },
      { key: 'structure_preference', label: 'Structure stricte vs flexibilité', type: 'text' },
      { key: 'discomfort_tolerance', label: 'Tolérance à l’inconfort / à la difficulté', type: 'text' },
      {
        key: 'scale_relationship',
        label: 'Rapport au chiffre sur la balance',
        type: 'textarea',
        helperText: 'Optionnel — utile si c’est une source de stress plutôt qu’un repère neutre pour toi.',
      },
      { key: 'communication_style_preference', label: 'Style de communication préféré', type: 'text' },
    ],
  },
  {
    id: 'outils',
    title: 'Outils connectés',
    fields: [
      { key: 'wearable_device', label: 'Montre / tracker utilisé', type: 'text' },
      { key: 'tracking_apps_used', label: 'Apps de suivi déjà utilisées', type: 'text' },
      { key: 'wants_data_sync', label: 'Envie de connecter ces données à l’app', type: 'boolean' },
    ],
  },
]
