const ipcRenderer = require('electron').ipcRenderer;
const path = require('path')
const fs = require('fs');
const BLOCK_SIZE = 10;
const PADDING = 100;
var path_map = "./map";
var data = null;
var result = null;

document.addEventListener("keydown", function(e) {
  if (e.which === 123) {
    require('electron').remote.getCurrentWindow().toggleDevTools();
  } else if (e.which === 116) {
    location.reload();
  }
});

function readFile(filepath, filename) {
  $('#inputFile-label-map').html(filename);
  let fileString = fs.readFileSync(filepath, "UTF-8");
  ipcRenderer.send('input', {fileString: fileString});
}

function clear() {
  $('#draw-result').empty();
}

function updateResult() {
  if (data == null) return;
  clear();
  let svg = $('#draw-result').svg('get');
  let min = {
    x: Math.min(...data.corners.map(c => c.x)),
    y: Math.min(...data.corners.map(c => c.y))
  }
  let width = (Math.max(...data.corners.map(c => c.x)) - min.x) * BLOCK_SIZE + PADDING * 2;
  let height = (Math.max(...data.corners.map(c => c.y)) - min.y) * BLOCK_SIZE + PADDING * 2;
  let offset = {
    x: min.x < 0 ? (-min.x) * BLOCK_SIZE : 0,
    y: min.y < 0 ? (-min.y) * BLOCK_SIZE : 0
  }
  $(svg.root()).width(width);
  $(svg.root()).height(height);

  // Draw track
  svg.polyline(
    data.corners.map(c => getCoordinate(c.x, c.y, offset, svg)),
    {fill: 'none', stroke: 'black', strokeWidth: 1}
  );
  for (corner of data.corners) {
    svg.circle(...getCoordinate(corner.x, corner.y, offset, svg), 1, {fill: 'black', stroke: 'black', strokeWidth: 5});
  }

  // Draw finish area
  svg.rect(
    ...getCoordinate(data.finish.topLeft.x, data.finish.topLeft.y, offset, svg),
    Math.abs(data.finish.bottomRight.x - data.finish.topLeft.x) * BLOCK_SIZE, Math.abs(data.finish.bottomRight.y - data.finish.topLeft.y) * BLOCK_SIZE,
    0, 0,
    {fill: 'none', stroke: 'red', strokeWidth: 1}
  );

  // Draw car
  let circle = svg.circle(...getCoordinate(data.start.x, data.start.y, offset, svg), 3 * BLOCK_SIZE, {fill: 'none', stroke: 'green', strokeWidth: 2});
  let line = svg.line(
    ...getCoordinate(data.start.x, data.start.y, offset, svg),
    ...getCoordinate(data.start.x, data.start.y + 6, offset, svg),
    {stroke: 'green', strokeWidth: 2, transform: 'rotate(' + (90 - data.start.degree) + ', ' + getCoordinate(data.start.x, data.start.y, offset, svg).toString() + ')'}
  );
  
  if (result) {
    result.forEach((r, i, a) => {
      // move car
      let color = (i === a.length - 1 ? 'red' : 'green');
      if (i !== 0) {
        $(circle).animate({
          svgStroke: color,
          svgCx: getCoordinate(r.x, r.y, offset, svg)[0],
          svgCy: getCoordinate(r.x, r.y, offset, svg)[1]
        }, 50);
        $(line).animate({
          svgStroke: color,
          svgX1: getCoordinate(r.x, r.y, offset, svg)[0],
          svgY1: getCoordinate(r.x, r.y, offset, svg)[1],
          svgX2: getCoordinate(r.x, r.y+6, offset, svg)[0],
          svgY2: getCoordinate(r.x, r.y+6, offset, svg)[1],
          svgTransform: 'rotate(' + (90 - r.degree) + ', ' + getCoordinate(r.x, r.y, offset, svg).toString() + ')'
        }, 50);
      }

      // Draw sensors
      // for (sensor of Object.values(r.sensors)) {
      //   svg.line(
      //     ...getCoordinate(r.x, r.y, offset, svg),
      //     ...getCoordinate(sensor.end.x, sensor.end.y, offset, svg),
      //     {fill: 'lime', stroke: 'lime', strokeWidth: 1}
      //   );
      // }
    });
  }
}

function getCoordinate(x, y, offset, svg) {
  return [PADDING + offset.x + x * BLOCK_SIZE, $(svg.root()).height() - (PADDING + offset.y + y * BLOCK_SIZE)];
}

ipcRenderer.on('input_res', function(evt, arg){
  console.log('data:', arg);
  data = arg;
  result = null;
  $('#draw-result').svg({onLoad: updateResult});
  updateResult();
});

ipcRenderer.on('start_res', function(evt, arg) {
  if (!arg)
    return;
  console.log('result:', arg);
  result = arg;
  updateResult();
});

$('#btnStart').click(function () {
  ipcRenderer.send('start');
});

$('.inputFile').change(function () {
  if ($(this).prop('files')[0]) {
    let inputFile = $(this).prop('files')[0];
    $(this).val('');
    readFile(inputFile.path, inputFile.name);
  }
});

$(window).resize(function() {
  $('#draw-result').svg({onLoad: updateResult});
});

fs.readdir(path_map, function(err, items) {
  items.forEach(item => {
    let $dropdown_item_map = $($.parseHTML('<a class="dropdown-item dropdown-item-map" href="#" filename="' + item + '" filepath="' + path.join(path_map, item) + '">' + item.slice(0, -4) + '</a>'));
    $dropdown_item_map.click(function () {
      let filename = $(this).attr('filename');
      let filepath = $(this).attr('filepath');
      readFile(filepath, filename);
    });
    $('#dropdown-menu-map').append($dropdown_item_map);
  });
});
readFile('./map/case01.txt', 'case01.txt');