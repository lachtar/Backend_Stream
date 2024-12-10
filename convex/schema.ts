import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Table des utilisateurs
  users: defineTable({
    name: v.string(),          // Nom de l'utilisateur
    phone: v.string(),         // Numéro de téléphone unique
    email: v.string(),         // Adresse e-mail unique
    passwordHash: v.string(),  // Hash du mot de passe
    createdAt: v.number(),     // Timestamp de création
  })
    .index("by_phone", ["phone"])  // Index pour rechercher par téléphone
    .index("by_email", ["email"]), // Index pour rechercher par e-mail

  // Table des messages
  messages: defineTable({
    body: v.string(),          // Contenu du message
    user: v.id("users"),       // Référence à l'utilisateur (relation)
    channelId: v.string(),     // Référence à l'ID du canal
    timestamp: v.number(),     // Horodatage pour trier les messages
  }).index("by_channel", ["channelId", "timestamp"]),
});
