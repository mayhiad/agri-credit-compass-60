
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
      instructions: `
Te egy SAPS (Egységes Területalapú Támogatási Rendszer) dokumentumokat elemző AI vagy.
A dokumentumok gazdálkodók területalapú támogatási kérelmeit tartalmazzák.

NAGYON FONTOS! OLVASD EL ALAPOSAN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

A FELADAT: a feltöltött mezőgazdasági dokumentum(ok)ból (jellemzően egységes kérelem, támogatási igénylés, stb.) azonosíts és gyűjts ki meghatározott adatokat, majd strukturáld azokat a megadott formátumban.

A dokumentumban keresd és azonosítsd az alábbi információkat:

1. Adminisztrációs alapadatokat:
   - Beadó neve (általában a dokumentum elején vagy fejlécben)
   - Beadó ügyfél-azonosító száma (általában 10 jegyű szám)
   - Kérelmező ügyfél-azonosító száma
   - Iratazonosító (általában 10 jegyű szám a dokumentum fejlécében vagy vonalkód mellett)
   - Egységes kérelem beadásának pontos időpontja (év/hónap/nap, óra:perc)
   - Meghatározott tárgyév (a kérelem melyik évre vonatkozik)

2. Blokkazonosítókat és méretüket:
   - Mezőgazdasági blokkok azonosítója (általában 8 karakteres, betűkből és számokból álló kód)
   - Minden blokkhoz tartozó terület mérete hektárban

3. Korábbi évek termésadatait:
   - A kárenyhítési/biztosítási részekben vagy múltbeli adatok táblázatában található
   - Kultúránként/terményfajtánként bontva
   - Minden elérhető évre (általában 5 évre visszamenőleg)
   - Mind a terület (ha), mind a termésmennyiség (tonna) adatai

4. Tárgyévi gazdálkodási adatokat:
   - Tervezett kultúrák/növények és azok területe
   - Hasznosítási kódok szerinti bontás (pl. KAL01, IND23 stb.)
   - Összesítő adatokat (szántóterület, állandó gyep, összes mezőgazdasági terület)

KÉRLEK, MINDIG ÍRD KI RENDESEN A NÖVÉNYKULTÚRÁT A HASZNOSÍTÁSI KÓD MELLETT (pl. KAL01 - Őszi búza)!

Az adatgyűjtés során vedd figyelembe:
- A dokumentum számos oldalból állhat, minden releváns adatot keress meg
- Az adatok különböző részeken lehetnek, teljes pontossággal olvasd be őket
- Hasznosítási kódokra figyelj (pl. KAL01=Őszi búza, IND23=Napraforgó, KAL21=Kukorica, stb.)
- A növénykultúrák nevét mindig pontosan írd ki a kód mellett
- A kárenyhítési/biztosítási részekben találhatók a korábbi évek termésadatai
- A blokkazonosítók listája általában a "Területek összesítése blokkhasználat szerint" résznél található
- Számolj területi összesítéseket és ellenőrizd a konzisztenciát
- Ahol az adott évre vagy kultúrára nincs adat, használj "-" jelölést
- Ellenőrizd az adatok pontosságát (tizedesjegyek, mértékegységek)

Az eredményt az alábbi JSON formátumban várom:

{
  "applicantName": "A beadó neve",
  "submitterId": "Beadó ügyfél-azonosító száma",
  "applicantId": "Kérelmező ügyfél-azonosító száma",
  "documentId": "Iratazonosító",
  "submissionDate": "Beadás időpontja (év/hónap/nap, óra:perc)",
  "year": "Tárgyév",
  "region": "Régió/megye",
  "hectares": 123.45,
  "cultures": [
    {
      "name": "KAL01 - Őszi búza",
      "hectares": 45.6
    }
  ],
  "blockIds": [
    {
      "id": "L12AB-C",
      "size": 10.5
    }
  ],
  "historicalData": [
    {
      "year": "2022",
      "totalHectares": 120.5,
      "crops": [
        {
          "name": "Őszi búza",
          "hectares": 45.6,
          "yield": 5.2,
          "totalYield": 237.12
        }
      ]
    }
  ]
}

NE GENERÁLJ SEMMILYEN HAMIS ADATOT! Ha nem találod az információt, inkább hagyd üresen az adott mezőt a JSON-ban.`
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
  console.log("📝 Thread létrehozásának kezdése...");
  try {
    const thread = await openai.beta.threads.create();
    console.log(`✅ Thread létrehozva: ${thread.id}`);
    return thread;
  } catch (error) {
    console.error("❌ Hiba thread létrehozáskor:", getErrorDetails(error));
    throw error;
  }
}

// Dokumentum szövegének feldolgozása és küldése az OpenAI-nak
export async function processDocumentText(threadId: string, assistantId: string, documentText: string) {
  console.log(`🔍 Dokumentum szöveg feldolgozásának indítása - Thread ID: ${threadId}, Asszisztens ID: ${assistantId}`);
  console.log(`📝 Dokumentum szöveg hossza: ${documentText.length} karakter`);
  
  const runStart = Date.now();
  
  try {
    // Létrehozunk egy üzenetet a dokumentum szövegével
    console.log(`📩 Üzenet hozzáadása a threadhez dokumentum szöveggel...`);
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `
A következő feladat: a feltöltött mezőgazdasági dokumentum(ok)ból (jellemzően egységes kérelem, támogatási igénylés, stb.) azonosíts és gyűjts ki meghatározott adatokat, majd strukturáld azokat a megadott formátumban.

A dokumentumban keresd és azonosítsd az alábbi információkat:

1. Adminisztrációs alapadatokat:
   - Beadó neve (általában a dokumentum elején vagy fejlécben)
   - Beadó ügyfél-azonosító száma (általában 10 jegyű szám)
   - Kérelmező ügyfél-azonosító száma
   - Iratazonosító (általában 10 jegyű szám a dokumentum fejlécében vagy vonalkód mellett)
   - Egységes kérelem beadásának pontos időpontja (év/hónap/nap, óra:perc)
   - Meghatározott tárgyév (a kérelem melyik évre vonatkozik)

2. Blokkazonosítókat és méretüket:
   - Mezőgazdasági blokkok azonosítója (általában 8 karakteres, betűkből és számokból álló kód)
   - Minden blokkhoz tartozó terület mérete hektárban

3. Korábbi évek termésadatait:
   - A kárenyhítési/biztosítási részekben vagy múltbeli adatok táblázatában található
   - Kultúránként/terményfajtánként bontva
   - Minden elérhető évre (általában 5 évre visszamenőleg)
   - Mind a terület (ha), mind a termésmennyiség (tonna) adatai

4. Tárgyévi gazdálkodási adatokat:
   - Tervezett kultúrák/növények és azok területe
   - Hasznosítási kódok szerinti bontás (pl. KAL01, IND23 stb.)
   - Összesítő adatokat (szántóterület, állandó gyep, összes mezőgazdasági terület)

AZ ALÁBBIAKBAN A DOKUMENTUM SZÖVEGE KÖVETKEZIK:

${documentText.substring(0, 25000)}

Kérlek, gyűjtsd ki a fenti információkat és add vissza a következő JSON formátumban:

{
  "applicantName": "A beadó neve",
  "submitterId": "Beadó ügyfél-azonosító száma",
  "applicantId": "Kérelmező ügyfél-azonosító száma",
  "documentId": "Iratazonosító",
  "submissionDate": "Beadás időpontja (év/hónap/nap, óra:perc)",
  "year": "Tárgyév",
  "region": "Régió/megye",
  "hectares": 123.45,
  "cultures": [
    {
      "name": "KAL01 - Őszi búza",
      "hectares": 45.6
    }
  ],
  "blockIds": [
    {
      "id": "L12AB-C",
      "size": 10.5
    }
  ],
  "historicalData": [
    {
      "year": "2022",
      "totalHectares": 120.5,
      "crops": [
        {
          "name": "Őszi búza",
          "hectares": 45.6,
          "yield": 5.2,
          "totalYield": 237.12
        }
      ]
    }
  ]
}

NE GENERÁLJ SEMMILYEN HAMIS ADATOT! Ha nem találod az információt, inkább hagyd üresen az adott mezőt a JSON-ban.`
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    
    // Futtatás indítása
    console.log(`🚀 Futtatás indítása a threaden (${threadId}) az asszisztenssel (${assistantId})...`);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: `
NAGYON FONTOS! A FELDOLGOZÁST PONTOSAN ÉS PRECÍZEN VÉGEZD EL!

Feldolgozandó dokumentum: SAPS (Egységes Területalapú Támogatási Rendszer) dokumentum

A következő feladat: a feltöltött mezőgazdasági dokumentum(ok)ból (jellemzően egységes kérelem, támogatási igénylés, stb.) azonosíts és gyűjts ki meghatározott adatokat, majd strukturáld azokat a megadott formátumban.

A dokumentumban keresd és azonosítsd az alábbi információkat:

1. Adminisztrációs alapadatokat:
   - Beadó neve (általában a dokumentum elején vagy fejlécben)
   - Beadó ügyfél-azonosító száma (általában 10 jegyű szám)
   - Kérelmező ügyfél-azonosító száma
   - Iratazonosító (általában 10 jegyű szám a dokumentum fejlécében vagy vonalkód mellett)
   - Egységes kérelem beadásának pontos időpontja (év/hónap/nap, óra:perc)
   - Meghatározott tárgyév (a kérelem melyik évre vonatkozik)

2. Blokkazonosítókat és méretüket:
   - Mezőgazdasági blokkok azonosítója (általában 8 karakteres, betűkből és számokból álló kód)
   - Minden blokkhoz tartozó terület mérete hektárban

3. Korábbi évek termésadatait:
   - A kárenyhítési/biztosítási részekben vagy múltbeli adatok táblázatában található
   - Kultúránként/terményfajtánként bontva
   - Minden elérhető évre (általában 5 évre visszamenőleg)
   - Mind a terület (ha), mind a termésmennyiség (tonna) adatai

4. Tárgyévi gazdálkodási adatokat:
   - Tervezett kultúrák/növények és azok területe
   - Hasznosítási kódok szerinti bontás (pl. KAL01, IND23 stb.)
   - Összesítő adatokat (szántóterület, állandó gyep, összes mezőgazdasági terület)

KÉRLEK, MINDIG ÍRD KI RENDESEN A NÖVÉNYKULTÚRÁT A HASZNOSÍTÁSI KÓD MELLETT (pl. KAL01 - Őszi búza)!

Ne feledd, hogy a JSON kimenetben NE GENERÁLJ SEMMILYEN HAMIS ADATOT! Ha nem találod az információt, inkább hagyd üresen az adott mezőt.`
    });
    
    const runTime = Date.now() - runStart;
    console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}, Státusz: ${run.status}`);
    return run;
  } catch (error) {
    console.error("❌ Hiba a futtatás létrehozása során:", getErrorDetails(error));
    console.error("❌ Hiba részletei:", JSON.stringify(error, null, 2));
    throw error;
  }
}
