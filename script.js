var canvas = document.querySelector("canvas");
var context = canvas.getContext("2d");
var ants = document.querySelector(".resize-container .resizing");

var presetSelect = document.querySelector("select.presets");
var download = document.querySelector("button.download");
var errorOut = document.querySelector(".error");
var statusOut = document.querySelector(".status");

var cancel = e => e.preventDefault();

var state = {
  mouse: null,
  selection: null,
  ratio: {
    width: 780,
    height: 501
  }
};

var [w, h] = presetSelect.value.split("x").map(Number);
state.ratio.width = w;
state.ratio.height = h;

var updateAnts = function() {
  ants.classList.toggle("show", state.selection);
  if (state.selection) {
    ants.style.left = Math.round(state.selection.x) + "px";
    ants.style.top = Math.round(state.selection.y) + "px";
    ants.style.width = Math.round(state.selection.width) + "px";
    ants.style.height = Math.round(state.selection.height) + "px";
  }
};

canvas.addEventListener("mousedown", function(e) {
  var bounds = canvas.getBoundingClientRect();
  var x = e.clientX - bounds.left;
  var y = e.clientY - bounds.top;
  state.mouse = { x, y };
  state.selection = null;
  errorOut.innerHTML = "";
});

document.addEventListener("mousemove", function(e) {
  if (!state.mouse) return;
  var bounds = canvas.getBoundingClientRect();
  var x = e.clientX - bounds.left;
  var y = e.clientY - bounds.top;
  var invertX = x < state.mouse.x;
  var invertY = y < state.mouse.y;
  var width = Math.abs(x - state.mouse.x);
  var height = Math.abs(y - state.mouse.y);
  if (width / state.ratio.width < height / state.ratio.height) {
    height = width / state.ratio.width * state.ratio.height;
  } else {
    width = height / state.ratio.height * state.ratio.width;
  }
  state.selection = {
    x: invertX ? state.mouse.x - width : state.mouse.x,
    y: invertY ? state.mouse.y - height : state.mouse.y,
    width, height
  }
  if (state.selection.x < 0) {
    state.selection.width += state.selection.x;
    state.selection.height = state.selection.width / state.ratio.width * state.ratio.height;
    state.selection.y = state.mouse.y - state.selection.height;
    state.selection.x = 0;
  }
  if (state.selection.y < 0) {
    state.selection.height = state.mouse.y;
    state.selection.width = state.selection.height / state.ratio.height * state.ratio.width;
    state.selection.x = state.mouse.x - state.selection.width;
    state.selection.y = 0;
  }
  if (state.selection.x + state.selection.width > bounds.width) {
    state.selection.width = bounds.width - state.selection.x;
    state.selection.height = state.selection.width / state.ratio.width * state.ratio.height;
  }
  if (state.selection.y + state.selection.height > bounds.height) {
    state.selection.height = bounds.height - state.selection.y;
    state.selection.width = state.selection.height / state.ratio.height * state.ratio.width;
  }
  updateAnts();
});

document.addEventListener("mouseup", function() {
  state.mouse = null;
  updateAnts();
});

presetSelect.addEventListener("change", function() {
  var [width, height] = presetSelect.value.split("x").map(Number);
  state.ratio = { width, height };
  state.selection = null;
  if (state.image && (state.image.width < state.ratio.width || state.image.height < state.ratio.height)) {
    errorOut.innerHTML = "Warning: this image is too small to crop for the selected preset";
  }
  updateAnts();
});

document.body.addEventListener("dragenter", cancel);
document.body.addEventListener("dragover", cancel);
document.body.addEventListener("drop", function(e) {
  cancel(e);
  errorOut.innerHTML = "";
  if (!e.dataTransfer || !e.dataTransfer.files) return;
  var f = e.dataTransfer.files[0];
  state.name = f.name.substring(0, f.name.lastIndexOf('.'));
  var reader = new FileReader();
  reader.onload = function() {
    state.image = new Image();
    state.image.onload = function() {
      statusOut.innerHTML = `Loaded: ${state.image.width}x${state.image.height}`;
      canvas.width = state.image.width;
      canvas.height = state.image.height;
      context.drawImage(state.image, 0, 0);
      state.selection = null;
      updateAnts();
      if (state.image.width < state.ratio.width || state.image.height < state.ratio.height) {
        errorOut.innerHTML = "Warning: this image is too small to crop for the selected preset";
      }
    }
    state.image.src = reader.result;
  };
  reader.readAsDataURL(f);
});

var downloadCropped = function() {
  if (!state.image) {
    return errorOut.innerHTML = "You need to add an image before you can crop it!";
  }
  if (!state.selection) {
    return errorOut.innerHTML = "No selection made: drag and drop an area to create a crop.";
  }
  var [width, height] = presetSelect.value.split("x").map(Number);
  var offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  var offscreen = offscreenCanvas.getContext("2d");
  var bounds = canvas.getBoundingClientRect();
  var crop = {
    x: state.selection.x / bounds.width * state.image.width,
    y: state.selection.y / bounds.height * state.image.height,
    width: state.selection.width / bounds.width * state.image.width,
    height: state.selection.height / bounds.height * state.image.height
  };
  if (crop.width < width || crop.height < height) {
    errorOut.innerHTML = "The crop is small: resulting image will be fuzzy. Ideally, select a larger area or use a bigger source image."
  }
  offscreen.drawImage(state.image, crop.x, crop.y, crop.width, crop.height, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
  var url = offscreenCanvas.toDataURL("image/jpeg");
  var a = document.createElement("a");
  a.href = url;
  a.download = state.name + "-cropped.jpg";
  a.dispatchEvent(new MouseEvent("click"));
};

download.addEventListener("click", downloadCropped);