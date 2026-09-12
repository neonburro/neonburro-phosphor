# hold to talk

<!-- the plan for speech in the burrow. steps one and four built. Tyler is against typing. -->

The burrow should let a person hold one button, talk, and be understood, in
english, japanese, spanish, then chinese, portuguese, french and whatever the
room needs. The plan, in the order it ships:

1. **hold to talk, browser first.** The Web Speech API does live speech to
   text on device in Chrome and Safari, free, no key, in most of our
   languages. One press and hold mic button on the composer. This ships with
   the first forum composer and costs nothing.
2. **translation.** Claude, best tier, one call: detect the language, store
   the original, render every reader their own language on demand. Posts keep
   the author's original as truth and translations are cached in a column per
   language, so a thread is translated once, not per reader.
3. **epoch's voice.** Text to speech on his replies with the browser's own
   speechSynthesis first. A real recorded voice is a later decision and a
   budget line, not a default.
4. **the fallback stt.** Where the Web Speech API is missing (every wallet
   in app browser on iphone), a hold to talk that records and sends audio to
   a server stt behind a Netlify function. Built 2026-09-12: deepgram nova-3
   prerecorded behind `netlify/functions/transcribe.js`, keyed by
   DEEPGRAM_API_KEY on the phosphor site, never in the browser. The rail
   pick and the recorder live in `src/lib/speech.js`, the dot in
   `src/pages/Room/index.jsx`. The profile language is sent explicitly,
   never multi, because multi does not cover zh. The caps are sixty seconds
   and five megabytes, named in both files.

Every sentence the interface itself speaks lives in src/data/copy.js keyed by
language. Add a language by adding a column there, never a second file.
