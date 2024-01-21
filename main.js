import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js";
import { FRUITS_BASE } from "./fruits";
import "./dark.css";
import config from './config.json';
import { sleep } from "openai/core";

const OPENAI_API_KEY = config.api_key;

let FRUITS = FRUITS_BASE;

let GeneratedImage="empty";
let items="";
let images = ['base/0.png', 'base/1.png', 'base/02_grape.png',
 'base/3.png', 'base/4.png','base/5.png', 'base/6.png',
  'base/7.png', 'base/8.png', 'base/9.png','base/10.png'];

let vertCache = {};
let textureCache = {};

let flagGenerate = false;

const engine = Engine.create();
const render = Render.create({
  engine,
  element: document.body,
  options: {
    wireframes: false,
    background: "#F7F4C8",
    width: 620,
    height: 850,
  }
});

const world = engine.world;

const leftWall = Bodies.rectangle(15, 395, 30, 790, {
  isStatic: true,
  render: { fillStyle: "#E6B143" }
});

const rightWall = Bodies.rectangle(605, 395, 30, 790, {
  isStatic: true,
  render: { fillStyle: "#E6B143" }
});

const ground = Bodies.rectangle(310, 820, 620, 60, {
  isStatic: true,
  render: { fillStyle: "#E6B143" }
});

const topLine = Bodies.rectangle(310, 150, 620, 2, {
  name: "topLine",
  isStatic: true,
  isSensor: true,
  render: { fillStyle: "#E6B143" }
})

World.add(world, [leftWall, rightWall, ground, topLine]);

Render.run(render);
Runner.run(engine);

let currentBody = null;
let currentFruit = null;
let disableAction = false;
let interval = null;

//FRUITSの画像を生成したい画像に変更する
function changeFruits() {
  images.map((image, index) => {
    FRUITS[index].name = image;
  });
}

function loadAllImages() {
  return Promise.all(FRUITS.map(async (fruit, index) => {
    let info =  await createEmojiInfo(fruit.name);
      vertCache[index] = info.vert;
      textureCache[index] = info.texture;
  }));
}

function addFruit() {
  const index = Math.floor(Math.random() * 5);
  //let index = 0;
  const fruit = FRUITS[index];
  
  const body = Bodies.fromVertices(300, 50, vertCache[index], {
    index: index,
    isSleeping: true,
    render: {
        sprite: {
            texture: textureCache[index]
        }
    },
    restitution: 0.2,
  })

  currentBody = body;
  currentFruit = fruit;

  World.add(world, body);
}

async function generateImage(index, inputValue){
      // APIリクエストのためのパラメータを設定します。
      const data = {
        prompt: inputValue+", illustlation, emoji, white background",
        n: 1,
        size: "256x256"
      };

      // fetchの処理が終わるまで待機します。
      await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST', // HTTPメソッド
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}` // APIキーをヘッダーに含める
        },
        body: JSON.stringify(data) // リクエストボディ
      })
      .then(response => response.json()) // レスポンスをJSON形式で取得
      .then(async data => {
        console.log(data); // レスポンスデータをコンソールに表示
        let urls = data.data.map(obj => obj.url);
        console.log(urls[0]);
        await fetch("http://localhost:5000/download_image", 
        {method: "POST", body: new URLSearchParams(
          {url: urls[0],index: index}),
        })
      })
      .catch(error => {
        console.error('Error:', error); // エラーが発生した場合はコンソールに表示
      });
}

// GPT-3｀のAPIを使ってジャンルに含まれるアイテムを生成する
async function generateItems(genre){
  const data = {
    model:"gpt-4-1106-preview",
    "messages":[
      {
        "role": "system",
        "content": "List 11 items belonging to a given genre in ascending order. \
        do not include anything other than items belonging to the genre. \
        if genre is not specified, the default is fruit. \
        Example: Fruits. In this case, the smallest fruit is cherry, \
        and the largest is watermelon, so the order is\
        Cherry<Strawberry<Grapes<Orange<Persimmon<Apple<Pear<Peach<Pineapple<Melon<Watermelon"
      },
      {
        "role": "user",
        "content": "動物"
      },
      {
        "role": "assistant",
        "content": "Ant<Bee<Turtle<Rabbit<Cat<Dog<Fox<Tiger<Bear<Elephant<Whale"
      },
      {
        "role": "user",
        "content": "国"
      },
      {
        "role": "assistant",
        "content": "Vatican City<Palau<Israel<Switzerland<South Korea<United Kingdom<New Zealand<Germany<Japan<United States<Russia"
      },
      {
        "role": "user",
        "content": genre
      }
    ]
  };

  // fetchの処理が終わるまで待機します。
  await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', // HTTPメソッド
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}` // APIキーをヘッダーに含める
    },
    body: JSON.stringify(data) // リクエストボディ
  })
  .then(response => response.json()) // レスポンスをJSON形式で取得
  .then(data => {
    console.log(data); // レスポンスデータをコンソールに表示
    items = data.choices[0].message.content;
  })
  .catch(error => {
    console.error('Error:', error); // エラーが発生した場合はコンソールに表示
  });
  
}

function alphaToWhite(data8U) {
  for (let i = 0; i < data8U.length; i += 4) {
      if (data8U[i + 3] == 0) {
          data8U[i] = 255;
          data8U[i + 1] = 255;
          data8U[i + 2] = 255;
          data8U[i + 3] = 255;
      }
  }
}
function createEmojiInfo(imagepath) {
  return new Promise((resolve, reject) => {
      var img = new Image();
      img.src = imagepath; // 画像への相対パス

      img.onload = function() {
          var canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          let source = cv.imread(canvas);
          alphaToWhite(source.data);

          let destC1 = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC1);
          let destC4 = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);

          cv.cvtColor(source, destC1, cv.COLOR_RGBA2GRAY);
          cv.threshold(destC1, destC4, 254, 255, cv.THRESH_BINARY);
          cv.bitwise_not(destC4, destC4);

          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();
          cv.findContours(destC4, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE, { x: 0, y: 0});
          hierarchy.delete();
          destC1.delete();
          destC4.delete();
          source.delete();

          let points = [];
          for (let i = 0; i < contours.size(); i++) {
              let d = contours.get(i).data32S;
              for (let j = 0; j < d.length; j++) {
                  points.push(d[j]);
              }
          }
          contours.delete();

          if (points.length < 3) {
              reject(new Error('Not enough points in contours.'));
              return;
          }

          let _points = new cv.Mat(1, points.length / 2, cv.CV_32SC2);
          let d = _points.data32S;

          for (let i = 0; i < points.length; i++) {
              d[i] = points[i];
          }
          let hull = new cv.Mat();
          cv.convexHull(_points, hull);
          _points.delete();

          let vert = [];
          d = hull.data32S;
          for (let i = 0; i < d.length; i += 2) {
              vert.push({ x: d[i], y: d[i + 1]});
          }
          hull.delete();

          const bounds = Matter.Bounds.create(vert);
          const texture = createTexture(canvas, bounds);

          resolve({
              vert: vert,
              texture: texture
          });
      };

      img.onerror = function() {
          reject(new Error('Image failed to load.'));
      };
  });
}

function createTexture(sourceCanvas, bounds) {
  let canvas = document.createElement('canvas');
  canvas.width = bounds.max.x - bounds.min.x + 1;
  canvas.height = bounds.max.y - bounds.min.y + 1;

  canvas.getContext('2d').drawImage(sourceCanvas, bounds.min.x, bounds.min.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}


document.getElementById('submitButton').addEventListener('click', async function() {
  var inputValue = document.getElementById('inputField').value;
   await generateItems(inputValue);
   console.log(items);
   items = items.replace(/>/g, "<");
   let itemsArray = items.split("<");

   let first_itemsArray = itemsArray.slice(0,5); // TODO: API制限回避のため，最初に5個，1分後にもう5個，というようにする
   await Promise.all(first_itemsArray.map(async function(item, index){
     await generateImage(index, item);
   }));

   setTimeout( async ()=>{
        // 1秒後の処理
        console.log("65秒後");
        let second_itemsArray = itemsArray.slice(5,10); // TODO: API制限回避のため，最初に5個，1分後にもう5個，というようにする
        console.log(second_itemsArray);
        await Promise.all(second_itemsArray.map(async function(item, index){
          await generateImage(index+5, item);
        }));
        changeFruits();
        await loadAllImages();
       flagGenerate=true;
    }, 65000);

    setTimeout( async ()=>{
      // 1秒後の処理
      console.log("130秒後");
      let third_itemsArray = itemsArray.slice(10,11); // TODO: API制限回避のため，最初に5個，1分後にもう5個，というようにする
      await Promise.all(third_itemsArray.map(async function(item, index){
        await generateImage(index+10, item);
      }));
      changeFruits();
      await loadAllImages();
     flagGenerate=true;
    }, 130000);


   


   changeFruits();
   await loadAllImages();
  alert("画像を変更しました");
  flagGenerate=true;
  addFruit();
});



window.onkeydown = (event) => {
  if (disableAction || !flagGenerate) {
    return;
  }

  switch (event.code) {
    case "KeyA":
      if (interval)
        return;

      interval = setInterval(() => {
        if (currentBody.position.x - currentFruit.radius > 30)
          Body.setPosition(currentBody, {
            x: currentBody.position.x - 1,
            y: currentBody.position.y,
          });
      }, 5);
      break;

    case "KeyD":
      if (interval)
        return;

      interval = setInterval(() => {
        if (currentBody.position.x + currentFruit.radius < 590)
        Body.setPosition(currentBody, {
          x: currentBody.position.x + 1,
          y: currentBody.position.y,
        });
      }, 5);
      break;

    case "KeyS":
      currentBody.isSleeping = false;
      disableAction = true;

      setTimeout(() => {
        addFruit();
        disableAction = false;
      }, 1000);
      break;
  }
}

window.onkeyup = (event) => {
  switch (event.code) {
    case "KeyA":
    case "KeyD":
      clearInterval(interval);
      interval = null;
  }
}

Events.on(engine, "collisionStart", (event) => {
  event.pairs.forEach((collision) => {
    if (collision.bodyA.index === collision.bodyB.index) {
      const index = collision.bodyA.index;

      if (index === FRUITS.length - 1) {
        return;
      }

      World.remove(world, [collision.bodyA, collision.bodyB]);

      const newFruit = FRUITS[index + 1];

      const newBody = Bodies.circle(
        collision.collision.supports[0].x,
        collision.collision.supports[0].y,
        newFruit.radius,
        {
          render: {
            sprite: { texture: `${newFruit.name}` }
          },
          index: index + 1,
        }
      );

      World.add(world, newBody);
    }

    if (
      !disableAction &&
      (collision.bodyA.name === "topLine" || collision.bodyB.name === "topLine")) {
      alert("Game over");
    }
  });
});


if (flagGenerate){
  changeFruits();
}
