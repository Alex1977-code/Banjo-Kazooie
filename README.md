# Bruno & Kiki – Das Geheimnis des Sonnensteins

Ein 3D-Jump'n'Run im Stil der großen N64-Plattformer: ein Dachs und ein frecher Rennkuckuck im Rucksack,
eine Welt voller Sammelkram, brabbelnde Figuren, ein niesender Zauberer – und das alles
direkt im Browser. Läuft auf dem **Handy mit Touch-Steuerung** und auf dem **Fernseher mit Controller**.

> Eigenständiges Fan-Projekt, inspiriert von Spielen wie *Banjo-Kazooie*. Alle Figuren, Level,
> Texturen, Sounds und Musikstücke sind eigens für dieses Spiel erstellt bzw. werden zur Laufzeit
> erzeugt – es werden keine Inhalte aus Nintendo- oder Rare-Spielen verwendet.

![Icon](icons/icon-192.png)

## Die Geschichte

Der gierige **König Krötus** will den goldenen **Sonnenstein** für seine Schatzkammer. Als er
ihn vom Sonnenhügel reißt, zerspringt der Stein in tausend Stücke – die Splitter fliegen in alle
Winde und das Wurzeltal wird grau und trüb. **Bruno** der Dachs und seine beste Freundin **Kiki**,
ein Rennkuckuck, der in Brunos Rucksack wohnt, ziehen los, um die **Sonnensplitter** vor Krötus'
Blechkäfern zu finden und dem Krötenkönig in seinem Turm das Handwerk zu legen.

| Welt | Was dich erwartet |
|---|---|
| **Wurzelhügel** (Hub) | Brunos Dachsbau, Opa Tilo erklärt alles, Lotti Langsam tauscht Beeren gegen Extra-Herzen, Lernsteine für Hochsprung & Stampfer, Felsturm und rissige Steinplatte. Tore zu allen Welten. |
| **Pilzwald** (1 Splitter) | Pauli Pilz gibt Tipps, Opa Eiche mit Wendel-Baumpilzen bis zur Krone, Hüpfpilze zur schwebenden Insel, Giftsumpf mit Seerosen und Wölkchen, Käferlichtung voller Blechkäfer, verlorenes Igelkind Stupsi und Boss Fürst Fliegenpilz im Hexenring (Sporenwellen, Sporenregen). |
| **Muschelbucht** (4 Splitter) | Leuchtturm mit Wendeltreppe, Tauchgang zum Schiffswrack, Schatzsuche mit Käpt'n Barnabas, Kaktus-Banditen, Boss Käpt'n Knack, schwimmende Fässer. |
| **Krötenturm** (10 Splitter) | Aufstieg über die Außentreppe, Wölkchen-Flug zur Bonusinsel und Endkampf gegen König Krötus in drei Phasen (Goldmünzen, Bauchplatscher, Blechkäfer). |

Insgesamt gibt es **15 Sonnensplitter**, fast **200 Beeren**, **10 Glühwürmchen** (alle fünf einer
Welt ergeben einen Splitter) und Extra-Herzen für alle Beeren einer Welt.

## Spielen

### Auf dem Handy
1. Die Seite im Browser öffnen (siehe [Veröffentlichen](#veröffentlichen)).
2. Handy quer halten, **Neues Spiel** antippen.
3. Optional: im Browser-Menü **„Zum Startbildschirm hinzufügen“** – dann startet das Spiel wie eine App im Vollbild und funktioniert auch offline.

### Auf dem Fernseher
Im Spiel unter **„Fernseher & Controller“** stehen beide Wege noch einmal erklärt:

- **Handy streamen + Controller:** Handybildschirm per Chromecast/„Smart View“/AirPlay auf den
  Fernseher spiegeln und einen Bluetooth-Controller (Xbox, PlayStation, Switch Pro, …) mit dem
  Handy koppeln. Der Controller wird automatisch erkannt, die Touch-Knöpfe verschwinden.
- **Spiel am Fernseher, Handy als Controller:** Das Spiel im Browser des Fernsehers, einer Konsole
  oder eines Laptops am HDMI-Anschluss öffnen → „Handy als Controller verbinden“ → QR-Code mit dem
  Handy scannen. Die Eingaben laufen per WebRTC direkt übers WLAN (für den Verbindungsaufbau wird
  kurz der öffentliche PeerJS-Server genutzt). Mit `?tv` in der Adresse (`…/index.html?tv`) wird
  die Anzeige für große Bildschirme vergrößert. Wer keinen öffentlichen Server nutzen möchte, kann
  einen eigenen [PeerServer](https://github.com/peers/peerjs-server) starten
  (`npx peer --port 9000`) und ihn mit `?peer=<host>:9000` angeben – der QR-Code übernimmt die
  Einstellung automatisch für das Handy.

## Steuerung

| Aktion | Handy | Controller | Tastatur |
|---|---|---|---|
| Laufen | linke Bildschirmhälfte (Joystick erscheint unterm Daumen) | linker Stick / Steuerkreuz | WASD / Pfeiltasten |
| Kamera | rechte Hälfte wischen, 📷 zentriert | rechter Stick, Y zentriert | Q / E, R zentriert |
| Springen (A) | grüner Knopf | A / Kreuz | Leertaste |
| Angriff / Reden (B) | blauer Knopf | B / X | J |
| Ducken / Stampfen (Z) | lila Knopf | Schultertasten / Trigger | Z / C / Shift |
| Pause | ⏸ oben rechts | Start | Esc |

**Bewegungen:** Sprung, Flattersprung (in der Luft A halten), Rolle (B), Schnabelhieb (B in der
Luft), sowie an Lernsteinen: **Hochsprung** (Z halten + A), **Stampfer** (Z in der Luft) und
**Tauchen** (Z im Wasser).

## Technik

- Reines **HTML5/JavaScript** mit [three.js](https://threejs.org) (WebGL) – kein Build-Schritt nötig.
- **N64-Look:** Bild wird absichtlich in niedriger Auflösung (240p/360p) gerendert und weich
  hochskaliert, Low-Poly-Modelle aus Grundformen, Vertex-Farben, kleine prozedurale Texturen mit
  bilinearer Filterung, Blob-Schatten, Entfernungsnebel. Auflösung und „Pixel-Look“ in den Optionen.
- **Lebendige Welt:** Bäume, Gras und Blumen wiegen sich im Wind (Vertex-Shader), Wasser mit sanften
  Wellen, Glitzern und Schaumrand am Ufer, Umgebungspartikel (Pollen, Schmetterlinge, Sporen, Gischt,
  Asche) und Stimmungszonen, in denen sich Nebel und Licht weich verändern. Teure Extras erst ab „Retro“.
- **Sound komplett synthetisiert** (Web Audio): Effekte, Brabbel-Stimmen und eigene Musikstücke pro Welt,
  Hall pro Welt (Impulsantwort aus Rauschen), Umgebungsgeräusche, Richtungshören und dumpfer Klang
  unter Wasser.
- **PWA:** Manifest + Service Worker → installierbar und offline spielbar.
- Spielstand wird automatisch im Browser gespeichert.

```
index.html            Spiel
controller.html       Handy-Controller für den TV-Modus
src/engine/           Renderer, Eingabe (Touch/Gamepad/Tastatur/Remote), Kamera, Kollision, Audio,
                      Partikel, Shader-Effekte (fx.js: Wind, Wasser, Uferschaum)
src/game/             Spielfigur, Modelle, Gegner & Objekte, Dialoge, Menüs, HUD, Speichern,
                      Stimmungszonen (mood.js), Umgebungspartikel (ambient.js)
src/levels/           Wurzelhügel, Pilzwald, Muschelbucht, Krötenturm (Datei nebelturm.js)
vendor/               three.js, PeerJS, QR-Code-Generator (siehe vendor/LICENSES.md)
tools/                Icon-Generator
```

## Lokal starten

```bash
npm start            # startet einen kleinen Webserver auf http://localhost:8080
```

Zum Testen auf dem Handy im selben WLAN `http://<IP-des-Rechners>:8080` öffnen. Hinweis: Service
Worker und Vollbild funktionieren auf dem Handy nur über **https** – dafür am besten GitHub Pages nutzen.

## Veröffentlichen

Das Repository enthält einen GitHub-Actions-Workflow (`.github/workflows/pages.yml`):

1. Auf GitHub unter **Settings → Pages** als Quelle **„GitHub Actions“** wählen.
2. Den Code auf `main` bringen (oder den Workflow manuell starten).
3. Das Spiel ist danach unter `https://<benutzer>.github.io/<repo>/` erreichbar – diese Adresse
   auf dem Handy öffnen und zum Startbildschirm hinzufügen.

Wer eine „echte“ App für den Play Store / App Store möchte, kann die Webseite z.B. mit
[Capacitor](https://capacitorjs.com) oder als Trusted Web Activity verpacken.

## Lizenz

Code: MIT (siehe `LICENSE`). Verwendete Bibliotheken und Schriften: siehe `vendor/LICENSES.md`.
