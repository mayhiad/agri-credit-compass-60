
import { openai, getErrorDetails } from "./openaiClient.ts";

// Asszisztens létrehozása
export async function createAssistant() {
  console.log("🤖 Asszisztens létrehozása...");
  const assistantStart = Date.now();
  
  const assistant = await openai.beta.assistants.create({
    name: "SAPS Dokumentum Elemző",
    instructions: `Olvasd ki a dokumentumból a gazdálkodó nevét, az iratazonosítószámot, a kérelmező ügyfél (gazdálkodó) ügyfél-azonosító számát. Keresd meg a dokumentum azon részét, amelyben az elmúlt öt év historikus gazdálkodási adatait látjuk, azaz, hogy mekkora területen milyen növénykultúrát termelt. Rendezd ezt táblázatba, dolgozd fel ezeket az adatokat és párosíts mellé az azokban az években nyilvánosan elérhető kultúrához tartozó világpiaci átlagárat, szorozd fel a területeken az adott években, adott régióban elvárható termésátlaggal, ezáltal becsüld meg az adott években termelt árbevételt. Majd keresd meg az összesítő táblázatot, amely a tárgyévre vonatkozik; olvasd be ugyanígy a területek méretét és az adott területeken előállított kultúrát, becsüld meg a területen az elmúlt öt év termésátlagát véve a várható terméshozamot (tonna), és szorozd fel a most aktuális, vagy az aratáskor várható világpiaci átlagárral. Így megkapjuk a tárgyévi, jövőbeni várható árbevételt. 
Rendezd struktúráltan, feldolgozhatóan.

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

Amikor becsült árbevételt számolsz:
- A területet szorozd meg a hozammal (t/ha), majd az eredményt a világpiaci árral (€/t)
- Az eredményt egész számként, ezer euróra kerekítve add vissza
- Forintba átszámolva használd a 380 HUF/EUR árfolyamot

Amikor az árbevételt becsülöd, nem kultúránként van rá szükség, hanem évenként szeretnénk elsősorban látni a becsült árbevételt, azon belül pedig kultúránkénti bontásban.

A histórikus adatok 5 évre visszamenően vannak a táblázatban, tehát eredményként mutasd meg az elmúlt öt év árbevételét egy összegző táblázatban!`,
    tools: [{ type: "file_search" }],
    model: "gpt-4o-mini"
  }).catch(error => {
    console.error("❌ Hiba az asszisztens létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const assistantTime = Date.now() - assistantStart;
  console.log(`✅ Asszisztens létrehozva (${assistantTime}ms). ID: ${assistant.id}`);
  
  return assistant;
}

// Thread létrehozása
export async function createThread() {
  console.log("📝 Thread létrehozása...");
  const threadStart = Date.now();
  
  const thread = await openai.beta.threads.create().catch(error => {
    console.error("❌ Hiba a thread létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const threadTime = Date.now() - threadStart;
  console.log(`✅ Thread létrehozva (${threadTime}ms). ID: ${thread.id}`);
  
  return thread;
}

// Üzenet hozzáadása egy threadhez (fájl nélkül)
export async function addMessageToThread(threadId: string, content: string = "Olvasd ki a SAPS dokumentum részleteit JSON formátumban.") {
  console.log(`📤 Üzenet létrehozása`);
  const messageStart = Date.now();
  
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: content
    });
    
    const messageTime = Date.now() - messageStart;
    console.log(`✅ Üzenet sikeresen létrehozva (${messageTime}ms). Message ID: ${message.id}`);
    return message;
  } catch (error) {
    console.error("❌ Hiba az üzenet létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  }
}

// Fájl hozzáadása a thread-hez és futtatás indítása
export async function startRun(threadId: string, assistantId: string, fileId: string) {
  console.log(`🏃 Feldolgozás indítása asszisztens ID-val: ${assistantId} és fájl ID-val: ${fileId}`);
  const runStart = Date.now();
  
  try {
    // Először adjuk hozzá a fájlt egy új üzenethez - a OpenAI API módosult, így külön kell kezelni a fájlt
    console.log(`📎 Fájl hozzáadása a thread-hez: ${fileId}`);
    
    const fileMessage = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: "Ez a feltöltött SAPS dokumentum, kérlek elemezd a korábbi kérésem szerint.",
      attachments: [{ file_id: fileId, type: "file_attachment" }]
    });
    
    console.log(`✅ Fájl sikeresen hozzáadva a thread-hez. Message ID: ${fileMessage.id}`);
    
    // Majd indítsuk el a futtatást a megfelelő v2 formátummal
    console.log(`🔄 Run létrehozása a tool_resources használatával...`);
    
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      tool_resources: {
        file_search: {
          file_ids: [fileId]
        }
      }
    });
    
    const runTime = Date.now() - runStart;
    console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}`);
    
    return run;
  } catch (error) {
    console.error("❌ Hiba a futtatás létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  }
}
