# Krachttraining

Je persoonlijke trainingsapp. Alles wat je logt blijft op je eigen telefoon staan:
er is geen server, geen account en geen inlog. De app werkt volledig offline.

Deze README gaat over vier dingen: **starten**, **bijwerken**, **publiceren** en
**back-up maken**. Verderop staat nog uitleg over hoe de app in elkaar zit.

---

## 1. De app starten op je pc

Je hebt [Node.js](https://nodejs.org) nodig (versie 22 of nieuwer). Dat installeer je
één keer.

Open daarna een terminal in de map `C:\Users\stefa\Gym app` en typ:

```bash
npm install
```

Dat haalt de onderdelen op waar de app uit is opgebouwd. Dit hoef je alleen de
eerste keer te doen, en later opnieuw als er iets aan de app verandert.

Om de app te bekijken:

```bash
npm run dev
```

In de terminal verschijnt een adres, meestal `http://localhost:5173`. Open dat in je
browser. Zolang dit venster openstaat, ververst de app zichzelf zodra er iets
verandert. Stoppen doe je met `Ctrl+C`.

**Wil je hem op je telefoon testen zonder te publiceren?** Start met
`npm run dev -- --host`. Je krijgt dan een tweede adres te zien (iets als
`http://192.168.1.23:5173`). Dat kun je op je telefoon openen zolang je op
hetzelfde wifi-netwerk zit. Let op: installeren op je startscherm en offline werken
lukt zo nog niet — daarvoor moet de app echt online staan. Zie stap 3.

---

## 2. De app bijwerken

Als er iets aan de app is veranderd (door jou of door Claude), doe je dit:

```bash
npm install
```

```bash
npm test
```

`npm test` controleert de rekenkant van de app: het progressieadvies, je records, de
schijvencalculator, je weekgemiddelde en de weeknummers. Zie je `24 passed`, dan
klopt de rekenkant. Zie je een rood `failed`, dan is er iets stuk en kun je beter
niet publiceren.

Daarna:

```bash
npm run build
```

Dit maakt de map `dist` met de kant-en-klare app. Gaat dit zonder fouten, dan kun je
publiceren.

**Als de app op je telefoon al geïnstalleerd is** en je publiceert een nieuwe versie,
dan krijg je in de app bovenin een balkje "Nieuwe versie klaar" met een knop
Vernieuwen. Je gegevens blijven daarbij gewoon staan. Klik je niets aan, dan werkt de
oude versie gewoon door — de app breekt nooit halverwege je training af.

---

## 3. De app publiceren (GitHub Pages)

Dit doe je één keer opzetten. Daarna is publiceren één handeling.

### Eenmalig opzetten

1. Maak een gratis account op [github.com](https://github.com) als je die nog niet hebt.
2. Maak een nieuwe repository aan. Noem hem bijvoorbeeld `gym-app`. Zet hem op
   **Private** als je niet wilt dat anderen meekijken — GitHub Pages werkt ook bij
   een private repo, als je een gratis account hebt kan dat betekenen dat je de repo
   op Public moet zetten.
3. Koppel deze map aan die repository. Vervang `JOUWNAAM` en `gym-app` door je eigen
   gegevens:

   ```bash
   git remote add origin https://github.com/JOUWNAAM/gym-app.git
   ```

   ```bash
   git branch -M main
   ```

   ```bash
   git push -u origin main
   ```

4. Ga in je repository op github.com naar **Settings → Pages**. Kies bij **Source**
   de optie **GitHub Actions**. Meer hoef je daar niet in te stellen.
5. Wacht een paar minuten. Onder het tabblad **Actions** zie je een taak "Publiceren"
   draaien. Als die groen is, staat je app online op
   `https://JOUWNAAM.github.io/gym-app/`.

Het adres bevat automatisch de naam van je repository. Noem je hem anders dan
`gym-app`, dan past dat zichzelf aan — je hoeft niets in de code te wijzigen.

### Elke volgende keer publiceren

```bash
git add -A
```

```bash
git commit -m "korte omschrijving van wat je veranderde"
```

```bash
git push
```

Meer niet. GitHub bouwt de app, draait de tests en zet hem online. Gaat er een test
stuk, dan wordt er niets gepubliceerd — dat is met opzet.

### Op je startscherm zetten

Open het adres op je Samsung in Chrome. Tik op de drie puntjes rechtsboven en kies
**App installeren** (of **Toevoegen aan startscherm**). Je krijgt een eigen icoon en
de app opent zonder browserbalk, in portretstand.

Vanaf dat moment werkt hij volledig offline: je hebt alleen internet nodig als je een
nieuwe versie wilt ophalen.

---

## 4. Back-up maken

**Dit is het belangrijkste hoofdstuk.** Je gegevens staan alleen in de opslag van je
browser op je telefoon. Wis je je browsergegevens, raak je je telefoon kwijt of
verwijder je de app, dan is alles weg. Er is geen server die het voor je bewaart.

Ga in de app naar **Meer → Back-up en export** en tik op **Back-up downloaden**. Je
krijgt een bestand met de datum in de naam, bijvoorbeeld
`krachttraining-backup-2026-09-04.json`. Mail dat naar jezelf of zet het in je
cloudopslag.

De app houdt dit voor je in de gaten: is je laatste back-up ouder dan 30 dagen, dan
verschijnt er een herinnering op je startscherm.

### Terugzetten

In hetzelfde scherm kies je **Bestand kiezen**. Je krijgt eerst te zien wat er in het
bestand zit (hoeveel trainingen, wegingen en zo verder) en daarna kies je:

- **Samenvoegen** — alles uit het bestand komt erbij. Bestaat een training al, dan
  wordt die overschreven; de rest blijft staan. Dit is de veilige keuze.
- **Alles vervangen** — wist eerst alles wat er nu in de app staat. Gebruik dit als je
  op een nieuwe telefoon overstapt. Dit kun je niet ongedaan maken.

Je moet altijd zelf bevestigen; er gebeurt niets zomaar.

### Naar een spreadsheet

Met **Trainingshistorie downloaden (CSV)** krijg je één regel per set. Het bestand
gebruikt puntkomma's en komma's als decimaalteken, dus Excel opent het in het
Nederlands meteen goed.

---

## Hoe de app in elkaar zit

### Alles is een gewoon record

Er staat nergens in de code een oefeningnaam of trainingsdag ingebakken. Alles wat je
ziet komt uit de database. Je kunt dus oefeningen toevoegen, hernoemen, aanpassen en
herordenen zonder dat er iets in de code hoeft te veranderen.

Waar je wat aanpast:

| Wat | Waar |
|---|---|
| Oefeningen (sets, reps, rust, stapgrootte, video, aandachtspunt) | Meer → Oefeningen |
| Trainingsdagen en hun volgorde | Meer → Schema's |
| Spiergroepen waarop je settelling optelt | Meer → Spiergroepen |
| Startdatum, deloadweken, stang en schijven, doeltempo | Meer → Instellingen |

Een oefening die je niet meer doet **archiveer** je in plaats van verwijderen. Hij
verdwijnt dan uit je keuzelijsten, maar je oude trainingen blijven leesbaar.

Hernoem je een oefening, dan houden oude trainingen de oude naam. Dat is met opzet:
zo blijft je historie kloppen met wat je destijds deed.

### Hoe het progressieadvies werkt

Dubbele progressie. Per oefening kijkt de app naar je vorige keer:

- Haalde je in **alle** sets het maximum van je bereik? → advies: gewicht omhoog met
  de stapgrootte van die oefening, en weer beginnen op het minimum aantal reps.
- Anders → advies: hetzelfde gewicht, één herhaling meer per set dan vorige keer.
  Nooit meer dan het maximum van je bereik.
- Nog nooit gedaan → geen getal, maar de tip om een gewicht te kiezen waarmee je het
  minimum haalt met 2-3 herhalingen over.

Het advies wordt **nooit automatisch ingevuld**. Het staat als suggestie in beeld; jij
bepaalt wat je invoert.

Bij een tijdgebonden lichaamsgewichtsoefening (zoals de hollow hold) bestaat er geen
gewicht om omhoog te doen. Haal je daar overal het maximum, dan is het advies om de
oefening zwaarder te maken met hefboom of tempo, en dat te noteren in het veld
"zwaarder gemaakt door".

### Hoe records worden geteld

Twee manieren, allebei automatisch:

- **Zwaarste gewicht** op die oefening.
- **Beste geschatte 1RM** volgens Epley: `gewicht × (1 + herhalingen / 30)`.

Bij lichaamsgewichtsoefeningen (zoals de pull-up) telt het extra gewicht, plus het
aantal herhalingen bij dat gewicht. Bij tijdgebonden oefeningen telt de langste tijd.
Opwarmsets tellen nooit mee.

### Sets per spiergroep

Een voltooide werkset telt **heel** mee voor de primaire spiergroep en voor de
**helft** voor elke secundaire. Een set die je als opwarmset markeert telt niet mee.
Je ziet dit per week, afgezet tegen je streefbereik van 10-14 (aanpasbaar).

### Je gegevens zijn direct opgeslagen

Elke tik op plus, min of het vinkje gaat meteen naar de database. Er is geen
opslaan-knop en er blijft niets in het geheugen hangen. Valt je telefoon uit
halverwege je training, dan kun je hem daarna gewoon hervatten via het startscherm.

### Over de rusttimer en het scherm

De rusttimer werkt met een eindtijdstip, niet met aftellen. Zet Android de app even op
een lager pitje, dan klopt de tijd bij terugkomen nog steeds. Bij nul trilt je
telefoon en klinkt een kort piepje.

Zolang een training loopt houdt de app je scherm aan (Wake Lock). Dat kun je uitzetten
onder Meer → Instellingen. Let op: een webapp kan geen melding sturen als je telefoon
in je zak zit met het scherm uit — daarom is die schermvergrendeling nuttig.

### YouTube-video's

Bij elke oefening kun je een YouTube-link invullen. De app accepteert alle gangbare
vormen (`youtube.com/watch?v=`, `youtu.be/`, `/shorts/`) en maakt daar één werkende
link van. Tijdens je training staat er dan een Video-knop die de video in een nieuw
tabblad of in de YouTube-app opent. De video wordt nooit in de app zelf geladen: dat
zou data kosten en het offline werken breken.

### Notities terugzoeken

Tijdens elke training zit rechtsonder een notitieknop. Onder **Meer → Notities
doorzoeken** staan al je notities bij elkaar en kun je op woorden zoeken. Typ
bijvoorbeeld `schouder` en je ziet elke training waarin je daar iets over schreef.

---

## Voor als je later iets wilt wijzigen

### Mappen

```
src/db/          het datamodel, de database en de startgegevens
src/lib/         de rekenlogica (progressie, records, schijven, gewicht, datums)
src/lib/*.test.ts de tests bij die rekenlogica
src/components/  bouwstenen die overal terugkomen (knoppen, kaarten, invoervelden)
src/screens/     de schermen
src/index.css    de kleuren, lettergroottes en afmetingen van het ontwerp
design/          het oorspronkelijke ontwerp uit Claude Design, als naslag
```

### De database veranderen zonder je gegevens te slopen

In `src/db/db.ts` staan genummerde versies van het databaseschema. Wil je later iets
toevoegen, voeg dan **altijd een nieuwe `this.version(n + 1)` toe** en pas nooit een
bestaande aan. Zo haalt de database je bestaande trainingen automatisch door de
nieuwe stap heen. Er staat een uitgebreidere uitleg in dat bestand zelf.

### Het icoon veranderen

Pas `scripts/maak-iconen.mjs` aan en draai:

```bash
node scripts/maak-iconen.mjs
```

### Nuttige commando's

| Commando | Wat het doet |
|---|---|
| `npm run dev` | app draaien op je pc, ververst zichzelf |
| `npm test` | controleert de rekenlogica |
| `npm run build` | bouwt de app voor publicatie |
| `npm run preview` | bekijkt de gebouwde app, inclusief offline werking |
| `npm run lint` | controleert de code op slordigheden |

---

## Waar je op moet letten

- **Gebruik geen privévenster.** In een privévenster wist je browser de opslag zodra
  je hem sluit, en dan ben je je trainingen kwijt.
- **Maak regelmatig een back-up.** De app herinnert je er na 30 dagen aan, maar
  eens per maand zelf even doen is verstandiger.
- **Wis niet zomaar je browsergegevens** op je telefoon voor deze site. Ook al staat
  de app op je startscherm, hij gebruikt de opslag van Chrome.
