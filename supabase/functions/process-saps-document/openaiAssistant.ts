
import OpenAI from "https://esm.sh/openai@4.38.0";
import { getErrorDetails } from "./openaiClient.ts";

// OpenAI kliens inicializálása
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openai = new OpenAI({
  apiKey: openAIApiKey,
  defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
});

// Asszisztens létrehozása (opcionálisan egyszer, majd assistantId mentés .env-be)
export async function createAssistant() {
  console.log("🤖 Asszisztens létrehozása...");
  const start = Date.now();

  try {
    const assistant = await openai.beta.assistants.create({
      name: "SAPS Dokumentum Elemző",
      model: "gpt-4o-mini",
      tools: [{ type: "file_search" }],
      instructions: `
Olvasd ki a dokumentumból a gazdálkodó nevét, az iratazonosítószámot, a kérelmező ügyfél (gazdálkodó) ügyfél-azonosító számát. Keresd meg a dokumentum azon részét, amelyben az elmúlt öt év historikus gazdálkodási adatait látjuk, azaz, hogy mekkora területen milyen növénykultúrát termelt. Rendezd ezt táblázatba, dolgozd fel ezeket az adatokat és párosíts mellé az azokban az években nyilvánosan elérhető kultúrához tartozó világpiaci átlagárat, szorozd fel a területeken az adott években, adott régióban elvárható termésátlaggal, ezáltal becsüld meg az adott években termelt árbevételt. Majd keresd meg az összesítő táblázatot, amely a tárgyévre vonatkozik; olvasd be ugyanígy a területek méretét és az adott területeken előállított kultúrát, becsüld meg a területen az elmúlt öt év termésátlagát véve a várható terméshozamot (tonna), és szorozd fel a most aktuális, vagy az aratáskor várható világpiaci átlagárral. Így megkapjuk a tárgyévi, jövőbeni várható árbevételt. Rendezd struktúráltan, feldolgozhatóan.

Használd az alábbi becsült adatokat az árbevétel számításhoz:
- Őszi búza: 6 t/ha, 230 €/t
- Napraforgó: 2,8 t/ha, 450 €/t
- Kukorica: 8 t/ha, 210 €/t
- Őszi árpa: 5,5 t/ha, 200 €/t
- Repce: 3,3 t/ha, 520 €/t

Az árakat tekintsd euróban, és számítsd ki minden kultúrára és évre az éves árbevételt, majd az összesített árbevételt is.

Kérlek, adj vissza egy strukturált táblázatot így:
| Kultúra | Terület (ha) | Hozam (t/ha) | Ár (€/t) | Termés (t) | Árbevétel (€) |

Kérlek, add vissza JSON formátumban a következő mezőkkel:
{
  "documentId": "IRATAZONOSÍTÓ",
  "applicantName": "GAZDÁLKODÓ NEVE",
  "applicantId": "ÜGYFÉL-AZONOSÍTÓ SZÁM",
  "region": "RÉGIÓ",
  "hectares": ÖSSZES TERÜLET HEKTÁRBAN,
  "year": "TÁRGYÉV",
  "blockIds": ["BLOKKAZONOSÍTÓK LISTÁJA"],
  "cultures": [
    {
      "name": "KULTÚRA NEVE",
      "hectares": KULTÚRA TERÜLETE,
      "estimatedRevenue": BECSÜLT ÁRBEVÉTEL
    }
  ],
  "totalRevenue": ÖSSZES BECSÜLT ÁRBEVÉTEL,
  "historicalData": [
    {
      "year": "ÉV",
      "totalRevenue": ÉVES BECSÜLT ÁRBEVÉTEL,
      "cultures": [
        {
          "name": "KULTÚRA NEVE",
          "hectares": KULTÚRA TERÜLETE,
          "yield": HOZAM (t/ha),
          "price": ÁR (€/t),
          "estimatedRevenue": BECSÜLT ÁRBEVÉTEL
        }
      ]
    }
  ],
  "marketPrices": [
    {
      "culture": "KULTÚRA NEVE",
      "averageYield": ÁTLAGOS HOZAM (t/ha),
      "price": ÁR (Ft/t),
      "trend": ÁRTREND SZÁZALÉKBAN
    }
  ]
}
`
    });

    const ms = Date.now() - start;
    console.log(`✅ Asszisztens létrehozva ${ms}ms alatt: ${assistant.id}`);
    return assistant;
  } catch (error) {
    console.error("❌ Hiba az asszisztens létrehozásakor:", getErrorDetails(error));
    throw error;
  }
}

// Thread létrehozása
export async function createThread() {
  try {
    const thread = await openai.beta.threads.create();
    console.log(`✅ Thread létrehozva: ${thread.id}`);
    return thread;
  } catch (error) {
    console.error("❌ Hiba thread létrehozáskor:", getErrorDetails(error));
    throw error;
  }
}

// Üzenet hozzáadása egy threadhez
export async function addMessageToThread(threadId, content = "Kérlek, dolgozd fel a SAPS dokumentumot!") {
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    return message;
  } catch (error) {
    console.error("❌ Hiba az üzenet hozzáadásakor:", getErrorDetails(error));
    throw error;
  }
}

// Fájl hozzáadása a thread-hez és futtatás indítása
export async function startRun(threadId, assistantId, fileId) {
  console.log(`🏃 Feldolgozás indítása asszisztens ID-val: ${assistantId} és fájl ID-val: ${fileId}`);
  const runStart = Date.now();
  try {
    // ✅ NE adjunk hozzá fájlt a messages.create()-hez v2-ben!

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      attachments: [
        {
          file_id: fileId,
          tools: ["file_search"]
        }
      ]
    });

    const runTime = Date.now() - runStart;
    console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}`);
    return run;
  } catch (error) {
    console.error("❌ Hiba a futtatás létrehozása során:", getErrorDetails(error));
    throw error;
  }
}
