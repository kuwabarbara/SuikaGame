import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js";
import { FRUITS_BASE } from "./fruits";
import "./dark.css";
import config from './config.json';

//OpenAIを用いて、画像生成を行う






let FRUITS = FRUITS_BASE;

let GeneratedImage="empty";


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
  try {
    if (GeneratedImage=="empty"){
      console.log("empty");
    }
    else{
      console.log(GeneratedImage);
      FRUITS[0].name = GeneratedImage;
      console.log("changeFruits");
    }
  } catch (error) {
    // エラーが発生した場合の処理
    console.error('エラーが発生しました:', error);
  }
}

function addFruit() {
  const index = Math.floor(Math.random() * 5);
  const fruit = FRUITS[index];

  const body = Bodies.circle(300, 50, fruit.radius, {
    index: index,
    isSleeping: true,
    render: {
      sprite: { texture: `${fruit.name}` }
    },
    restitution: 0.2,
  });

  currentBody = body;
  currentFruit = fruit;

  World.add(world, body);
}

function generateImage(inputValue){
        // APIキーを変数に保存します。セキュリティ上の理由から、本番環境ではAPIキーを直接コードに記述することは避けてください。
      //const config = require('config.json');
      const OPENAI_API_KEY = config.api_key;
      console.log(inputValue);
      // APIリクエストのためのパラメータを設定します。
      const data = {
        prompt: "Please generate a "+inputValue+" image",
        n: 1,
        size: "256x256"
      };

      // fetch APIを使ってリクエストを送信します。
      fetch('https://api.openai.com/v1/images/generations', {
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
        let urls = data.data.map(obj => obj.url);
        console.log(urls[0]);
        GeneratedImage=urls[0];
      })
      .catch(error => {
        console.error('Error:', error); // エラーが発生した場合はコンソールに表示
      });

}

document.getElementById('submitButton').addEventListener('click', function() {
  var inputValue = document.getElementById('inputField').value;
  alert("入力された値: " + inputValue);
  generateImage(inputValue);
  //changeFruits(inputValue);
});


window.onkeydown = (event) => {
  if (disableAction) {
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

    case "KeyR":
      changeFruits();
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

addFruit();
