import { httpAction } from "./_generated/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export const createUser = httpAction(async (ctx, request) => {
  try {
    // Extraire les données de la requête
    const { email, password, phone } = await request.json();

    // Validation des entrées
    if (!email || !password || !phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await ctx.runQuery("users.by_phone", { phone });
    if (existingUser) {
      return new Response(JSON.stringify({ error: "User already exists" }), {
        status: 409,
      });
    }

    // Générer un ID utilisateur
    const userId = uuidv4().slice(0, 50);

    // Hacher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Insérer un nouvel utilisateur
    await ctx.runMutation("users.create", {
      userId,
      email,
      phone,
      passwordHash,
      createdAt: Date.now(),
    });

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error in createUser:", error);
    return new Response(JSON.stringify({ error: "Internal server errorrrrr" }), {
      status: 500,
    });
  }
});
