#!/usr/bin/env node

const { exec, execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const stateFile = path.join(os.homedir(), '.terminal-pet-a.json');
const defaults = { hunger: 50, energy: 70, mood: 'happy' };
const sprites = {
  default: String.raw` /\_/\\
( o.o )
 > ^ <`,
  feed: String.raw` /\_/\\
( o.o )  ♡
 ( つ🍪)`,
  play: String.raw` /\_/\\
( ^.^ )  *
 /|  ⚾`,
  sleep: String.raw` /\_/\\
( -.- ) zZ
 (   )`,
};

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return {
      hunger: clamp(state.hunger),
      energy: clamp(state.energy),
      mood: typeof state.mood === 'string' ? state.mood : defaults.mood,
    };
  } catch {
    return { ...defaults };
  }
}

function clamp(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50;
}

function saveState(state) {
  try {
    fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  } catch (error) {
    console.error(`Could not save pet status: ${error.message}`);
  }
}

function showPet(sprite = 'default') {
  console.log(sprites[sprite] || sprites.default);
}

function help() {
  console.log(`\nTerminal Pet commands:
  help                       Show all commands
  status                     Show your pet's mood, hunger, and energy
  feed                       Give your pet a snack
  play                       Play a quick catch game
  sleep                      Let your pet rest and restore energy
  remind <duration> <text>   Show a reminder (duration: 10s, 5m, or 2h)
  message <text>             Ask your pet to echo a message
  open <site>                Open a developer site or URL
  speak                      Hear a motivational developer quote
  work                       Open Google Chrome`);
}

function openWithDefaultApp(target) {
  if (process.platform === 'darwin') {
    execFile('open', [target], reportOpenResult);
  } else if (process.platform === 'win32') {
    execFile('cmd', ['/c', 'start', '', target], reportOpenResult);
  } else {
    execFile('xdg-open', [target], reportOpenResult);
  }
}

function reportOpenResult(error) {
  if (error) {
    console.error(`Could not open the page: ${error.message}`);
    process.exitCode = 1;
  }
}

const command = process.argv[2];
const args = process.argv.slice(3);
const state = loadState();

if (!command) {
  showPet();
  console.log('\nWelcome to your terminal pet! Type "mypet help" to see all commands.');
} else if (command === 'help' || command === '--help' || command === '-h') {
  showPet();
  help();
} else if (command === 'status') {
  showPet();
  console.log(`\nMood: ${state.mood}\nHunger: ${state.hunger}/100 (higher means hungrier)\nEnergy: ${state.energy}/100`);
} else if (command === 'feed') {
  showPet('feed');
  state.hunger = clamp(state.hunger - 25);
  state.mood = 'happy';
  saveState(state);
  console.log('\nYum! Your terminal pet happily munches its treats.');
} else if (command === 'play') {
  showPet('play');
  state.energy = clamp(state.energy - 15);
  state.hunger = clamp(state.hunger + 10);
  state.mood = 'playful';
  saveState(state);
  console.log('\nYour cat bats the ball around and catches it!');
} else if (command === 'sleep') {
  showPet('sleep');
  state.energy = 100;
  state.mood = 'rested';
  saveState(state);
  console.log('\nYour pet takes a cozy nap and wakes up full of energy.');
} else if (command === 'remind') {
  const [duration, ...messageParts] = args;
  const match = typeof duration === 'string' && duration.match(/^(\d+)(s|m|h)$/i);
  const message = messageParts.join(' ').trim();
  if (!match || !message) {
    console.error('Usage: mypet remind <duration> <text> (for example: mypet remind 10m stretch)');
    process.exitCode = 1;
  } else {
    const units = { s: 1000, m: 60000, h: 3600000 };
    const delay = Number(match[1]) * units[match[2].toLowerCase()];
    if (!Number.isSafeInteger(delay) || delay <= 0 || delay > 24 * 3600000) {
      console.error('Choose a reminder time between 1 second and 24 hours.');
      process.exitCode = 1;
    } else {
      console.log(`Reminder set for ${duration}: ${message}`);
      setTimeout(() => console.log(`\n⏰ Reminder: ${message}`), delay);
    }
  }
} else if (command === 'message') {
  const message = args.join(' ').trim();
  if (!message) {
    console.error('Usage: mypet message <text>');
    process.exitCode = 1;
  } else {
    showPet();
    console.log(`\nYour pet says: ${message}`);
  }
} else if (command === 'open') {
  const site = args[0];
  const sites = {
    docs: 'https://developer.mozilla.org/',
    mdn: 'https://developer.mozilla.org/',
    github: 'https://github.com/',
    npm: 'https://www.npmjs.com/',
    stackoverflow: 'https://stackoverflow.com/',
  };
  let target = sites[(site || '').toLowerCase()];
  if (!target && site) {
    try {
      const url = new URL(site.includes('://') ? site : `https://${site}`);
      if (url.protocol === 'http:' || url.protocol === 'https:') target = url.toString();
    } catch {
      // Invalid URLs are handled by the usage message below.
    }
  }
  if (!target) {
    console.error('Usage: mypet open <docs|github|npm|stackoverflow|https://example.com>');
    process.exitCode = 1;
  } else {
    console.log(`Opening ${target}`);
    openWithDefaultApp(target);
  }
} else if (command === 'speak') {
  showPet();
  console.log('\n“You don’t have to see the whole staircase, just take the first step.” — Martin Luther King Jr.');
} else if (command === 'work') {
  const openChrome = process.platform === 'win32'
    ? 'start "" chrome'
    : process.platform === 'darwin'
      ? 'open -a "Google Chrome"'
      : 'google-chrome';
  exec(openChrome, (error) => {
    if (error) {
      console.error(`Could not open Google Chrome: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    console.log('Google Chrome is open. Time to build something great!');
  });
} else {
  console.error(`Unknown command "${command}". Run "mypet help" to see available commands.`);
  process.exitCode = 1;
}
