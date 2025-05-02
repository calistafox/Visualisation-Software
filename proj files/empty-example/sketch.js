let mic;
let recorder;
let soundFile;

// amplitude and frequency analysis tools
let amp;
let fft;

let isRecording = false;
let recordTime = 20000; //20 sec

// buttons
let audioButton;
let recordButton;
let stopButton;
let visualiseButton;
let restartButton;
let replayButton;
let saveButton;

// countdown for recording
let countdown = 0;
let countdownStartTime = 0;
let showProgressBar = false;
let micReady = false;

// Visualisation
let visualising = false;
let level; //current volume level
let points = [];
let x = 300;
let y = 200;

// states
const stateRecord = "record";
const stateWaiting = "waitingToVisualise";
const stateVisualise = "visualise";
const stateFinished = "visualiseFinished";
let state = stateRecord;

function setup() {
  createCanvas(600, 400);
  audioButton = buttonHandler(
    "Allow device microphone access",
    getAudioAccess,
    150,
    150
  );
}

// function to make buttons
function buttonHandler(label, handler, x, y) {
  let button = createButton(label);
  button.position(x, y);
  button.mousePressed(handler);
  return button;
}

function getAudioAccess() {
  userStartAudio().then(() => {
    audioButton.hide();
    getMic();
  });
}

// function to ensure correct state and correct buttons on display
function updateUI() {
  if (recordButton) recordButton.hide();
  if (stopButton) stopButton.hide();
  if (visualiseButton) visualiseButton.hide();
  if (restartButton) restartButton.hide();

  // switch statemetn to only show relevant buttons to the current state
  switch (state) {
    case stateRecord:
      if (!recordButton) {
        recordButton = buttonHandler(
          "Start Recording",
          startRecording,
          100,
          80
        );
      }
      if (!stopButton) {
        stopButton = buttonHandler("Stop Recording", stopRecording, 300, 80);
      }
      recordButton.show();
      stopButton.show();
      break;

    case stateWaiting:
      if (!visualiseButton) {
        visualiseButton = buttonHandler(
          "Visualise Sound",
          startVisualisation,
          200,
          200
        );
      }
      if (!recordButton) {
        recordButton = buttonHandler(
          "Start Recording",
          startRecording,
          100,
          80
        );
      }
      if (!stopButton) {
        stopButton = buttonHandler("Stop Recording", stopRecording, 100, 80);
      }
      visualiseButton.show();
      recordButton.show();
      stopButton.show();
      break;

    case stateVisualise:
      soundFile.play();

      break;

    case stateFinished:
      if (!restartButton) {
        restartButton = buttonHandler(
          "Record Again",
          resetToRecording,
          250,
          150
        );
      }
      restartButton.show();
      break;
  }
}

function getMic() {
  mic = new p5.AudioIn(); //starts mic input
  mic.start(() => {
    //starts mic
    recorder = new p5.SoundRecorder(); //creates recorder
    recorder.setInput(mic); // sets mic input to recorder
    micReady = true; // marks mic ready to use

    updateUI();
  });
  recordButton = buttonHandler("Start Recording", startRecording, 100, 80);
  stopButton = buttonHandler("Stop Recording", stopRecording, 300, 80);
}

function setState(newState) {
  console.log("state changing to ", newState);
  state = newState;
  updateUI();
}

function startRecording() {
  if (!micReady) return;

  soundFile = new p5.SoundFile();
  isRecording = true;
  showProgressBar = true;
  countdown = recordTime / 1000;
  countdownStartTime = millis();

  console.log("recording started");

  // start recording
  recorder.record(soundFile, countdown, () => {
    isRecording = false;
    showProgressBar = false;
    setState(stateWaiting);
  });
}

function stopRecording() {
  if (!isRecording) return;

  recorder.stop();
  isRecording = false;
  showProgressBar = false;

  setTimeout(() => {
    setState(stateWaiting);
  }, 250);
}

function startVisualisation() {
  if (!soundFile?.isLoaded()) {
    setTimeout(startVisualisation, 250);
    return;
  }
  console.log("start visualisation");

  amp = new p5.Amplitude(); // for volume analysis
  fft = new p5.FFT(); // for frequency analysis
  amp.setInput(soundFile);
  fft.setInput(soundFile);

  console.log(amp);

  visualising = true;
  showProgressBar = false;

  // soundFile.play();
  setState(stateVisualise);

  soundFile.onended(() => {
    setTimeout(() => setState(stateFinished), 1000);
  });
}

function resetToRecording() {
  if (restartButton) restartButton.remove();
  points = [];
  x = 0;
  y = 0;
  visualising = false;
  setState(stateRecord);
}

function draw() {
  if (state === stateVisualise) {
    background("white");

    //spectrum array has bands of frequency and sorts the sound into one of them
    let spectrum = fft.analyze(); // analyzes sounds frequency

    level = amp.getLevel(); //gets amp of sound
    let pitch = fft.getCentroid(); // gets pitch of sound

    let low = spectrum[0];
    let mid = spectrum[1];
    let high = spectrum[2];

    // calculates movement based on pitch
    let angle = map(pitch, 100, 2000, -PI, PI);
    // higher the frequency the faster the line moves
    let dx = cos(angle) * map(high, 0, 255, 5, 100);
    let dy = sin(angle) * map(mid, 0, 255, 5, 100);

    // stops shape going outside canvas
    x = constrain(x + dx, 10, width - 10);
    y = constrain(y + dy, 10, height - 10);

    // sets strokeweight based on frquencies
    let weight = map(level, 0, 1, 2, 80);
    stroke(
      map(low, 0, 255, 0, 255),
      map(mid, 0, 255, 0, 255),
      map(high, 0, 255, 0, 255)
    );
    points.push({ x, y, weight });

    noFill();

    for (let i = 1; i < points.length; i++) {
      let p1 = points[i - 1];
      let p2 = points[i];

      let offsetX1 = sin(p1.x * 0.05) * 10;
      let offsetY1 = sin(p1.y * 0.05) * 10;
      let offsetX2 = sin(p2.x * 0.05) * 10;
      let offsetY2 = sin(p2.y * 0.05) * 10;

      strokeWeight(p2.weight);
      line(p1.x + offsetX1, p1.y + offsetY1, p2.x + offsetX2, p2.y + offsetY2);
    }
  } else if (state === stateRecord && isRecording) {
    // show countdown timer
    let elapsed = (millis() - countdownStartTime) / 1000;
    let remaining = max(0, countdown - elapsed);
    if (remaining === 0 && isRecording) {
      isRecording = false;
      showProgressBar = false;
      setState(stateWaiting);
      return;
    }

    fill(230);
    stroke(0);
    rect(140, 350, 300, 30);

    console.log("timer");

    let w = map(remaining, countdown, 0, 300, 0);
    fill("#000");
    noStroke();
    rect(140, 350, w, 30);

    fill("white");
    noStroke();
    rect(180, 280, 200, 25);

    fill(0);
    textSize(16);
    text(`Recording ${ceil(remaining)}s left`, 200, 300); //ceil rounds to nearest whole number
  }
}
