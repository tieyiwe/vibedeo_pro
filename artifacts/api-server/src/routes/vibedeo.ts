import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateCharacterBody,
  CreateCharacterResponse,
  CreateGenerationBody,
  CreateGenerationResponse,
  CreateGenerationShareParams,
  CreateGenerationShareResponse,
  DeleteCharacterParams,
  EnhancePromptBody,
  EnhancePromptResponse,
  GetCreditsResponse,
  GetDashboardSummaryResponse,
  GetGenerationParams,
  GetGenerationResponse,
  ListCharactersResponse,
  ListGenerationsResponse,
  UpdateCharacterBody,
  UpdateCharacterParams,
  UpdateCharacterResponse,
} from "@workspace/api-zod";
import {
  charactersTable,
  db,
  generationsTable,
  vibedeoUsersTable,
} from "@workspace/db";
import {
  createGenerationRecord,
  createLockedDescription,
  DEMO_USER_ID,
  enhancePromptText,
  ensureDemoData,
  getCharacter,
  listGenerationResponses,
  toGenerationResponse,
} from "../lib/vibedeo";

const router: IRouter = Router();

router.use(async (_req, _res, next): Promise<void> => {
  await ensureDemoData();
  next();
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const generations = await listGenerationResponses();
  const [user] = await db
    .select()
    .from(vibedeoUsersTable)
    .where(eq(vibedeoUsersTable.id, DEMO_USER_ID));
  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.userId, DEMO_USER_ID));

  res.json(
    GetDashboardSummaryResponse.parse({
      credits: user?.credits ?? 0,
      totalGenerations: generations.length,
      completedGenerations: generations.filter(
        (generation) => generation.status === "completed",
      ).length,
      processingGenerations: generations.filter(
        (generation) =>
          generation.status === "processing" ||
          generation.status === "queued",
      ).length,
      savedCharacters: characters.length,
      recentGenerations: generations.slice(0, 4),
    }),
  );
});

router.get("/credits", async (_req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(vibedeoUsersTable)
    .where(eq(vibedeoUsersTable.id, DEMO_USER_ID));
  res.json(
    GetCreditsResponse.parse({
      credits: user?.credits ?? 0,
      plan: user?.plan ?? "Creator",
      nextPack: "100 credits",
    }),
  );
});

router.get("/generations", async (_req, res): Promise<void> => {
  res.json(ListGenerationsResponse.parse(await listGenerationResponses()));
});

router.post("/generations", async (req, res): Promise<void> => {
  const parsed = CreateGenerationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const generation = await createGenerationRecord(parsed.data);
    res.status(201).json(CreateGenerationResponse.parse(generation));
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      res.status(400).json({ error: "You do not have enough credits." });
      return;
    }
    throw error;
  }
});

router.get("/generations/:id", async (req, res): Promise<void> => {
  const params = GetGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({
      generation: generationsTable,
      characterName: charactersTable.name,
    })
    .from(generationsTable)
    .leftJoin(
      charactersTable,
      eq(generationsTable.characterId, charactersTable.id),
    )
    .where(
      and(
        eq(generationsTable.id, params.data.id),
        eq(generationsTable.userId, DEMO_USER_ID),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Generation not found." });
    return;
  }
  res.json(
    GetGenerationResponse.parse(
      toGenerationResponse(row.generation, row.characterName),
    ),
  );
});

router.post("/generations/:id/share", async (req, res): Promise<void> => {
  const params = CreateGenerationShareParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const token = randomUUID();
  const [updated] = await db
    .update(generationsTable)
    .set({ shareToken: token })
    .where(
      and(
        eq(generationsTable.id, params.data.id),
        eq(generationsTable.userId, DEMO_USER_ID),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Generation not found." });
    return;
  }
  res.json(
    CreateGenerationShareResponse.parse({
      url: `/share/${updated.id}?token=${token}`,
      expiresIn: 604800,
    }),
  );
});

router.get("/characters", async (_req, res): Promise<void> => {
  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.userId, DEMO_USER_ID))
    .orderBy(desc(charactersTable.createdAt));
  res.json(
    ListCharactersResponse.parse(
      characters.map((character) => ({
        id: character.id,
        name: character.name,
        sourceDescription: character.sourceDescription,
        lockedDescription: character.lockedDescription,
        style: character.style,
        referenceImageUrl: character.referenceImageUrl,
        usageCount: character.usageCount,
        createdAt: character.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/characters", async (req, res): Promise<void> => {
  const parsed = CreateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [character] = await db
    .insert(charactersTable)
    .values({
      id: randomUUID(),
      userId: DEMO_USER_ID,
      name: parsed.data.name,
      sourceDescription: parsed.data.sourceDescription,
      lockedDescription: createLockedDescription(
        parsed.data.name,
        parsed.data.sourceDescription,
      ),
      style: parsed.data.style,
    })
    .returning();
  res.status(201).json(
    CreateCharacterResponse.parse({
      id: character.id,
      name: character.name,
      sourceDescription: character.sourceDescription,
      lockedDescription: character.lockedDescription,
      style: character.style,
      referenceImageUrl: character.referenceImageUrl,
      usageCount: character.usageCount,
      createdAt: character.createdAt.toISOString(),
    }),
  );
});

router.patch("/characters/:id", async (req, res): Promise<void> => {
  const params = UpdateCharacterParams.safeParse(req.params);
  const parsed = UpdateCharacterBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid character update." });
    return;
  }
  const current = await getCharacter(params.data.id);
  if (!current) {
    res.status(404).json({ error: "Character not found." });
    return;
  }
  const name = parsed.data.name ?? current.name;
  const sourceDescription =
    parsed.data.sourceDescription ?? current.sourceDescription ?? "";
  const [character] = await db
    .update(charactersTable)
    .set({
      ...parsed.data,
      lockedDescription: createLockedDescription(name, sourceDescription),
    })
    .where(
      and(
        eq(charactersTable.id, params.data.id),
        eq(charactersTable.userId, DEMO_USER_ID),
      ),
    )
    .returning();
  res.json(
    UpdateCharacterResponse.parse({
      id: character.id,
      name: character.name,
      sourceDescription: character.sourceDescription,
      lockedDescription: character.lockedDescription,
      style: character.style,
      referenceImageUrl: character.referenceImageUrl,
      usageCount: character.usageCount,
      createdAt: character.createdAt.toISOString(),
    }),
  );
});

router.delete("/characters/:id", async (req, res): Promise<void> => {
  const params = DeleteCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(charactersTable)
    .where(
      and(
        eq(charactersTable.id, params.data.id),
        eq(charactersTable.userId, DEMO_USER_ID),
      ),
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Character not found." });
    return;
  }
  res.sendStatus(204);
});

router.post("/prompts/enhance", async (req, res): Promise<void> => {
  const parsed = EnhancePromptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const character = await getCharacter(parsed.data.characterId);
  res.json(
    EnhancePromptResponse.parse({
      originalPrompt: parsed.data.prompt,
      enhancedPrompt: enhancePromptText(
        parsed.data.prompt,
        parsed.data.style,
        character,
      ),
      notes: [
        "Added camera direction and shot progression",
        "Added environmental motion and depth",
        character
          ? `Locked ${character.name}'s defining visual traits`
          : "Strengthened subject continuity",
      ],
    }),
  );
});

export default router;