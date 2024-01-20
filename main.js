import { Bodies, Body, Engine, Events, Render, Runner, World } from "matter-js";
import { FRUITS_BASE } from "./fruits";
import "./dark.css";
import config from './config.json';

const OPENAI_API_KEY = config.api_key;

let FRUITS = FRUITS_BASE;

let GeneratedImage="empty";
let items="";
let images = ['base/0.png', 'base/1.png', 'base/02_grape.png',
 'base/3.png', 'base/4.png','base/5.png', 'base/6.png',
  'base/7.png', 'base/8.png', 'base/9.png','base/10.png'];

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

async function generateImage(index, inputValue){
      // APIリクエストのためのパラメータを設定します。
      const data = {
        prompt: inputValue+", emoji, white background",
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

document.getElementById('submitButton').addEventListener('click', async function() {
  var inputValue = document.getElementById('inputField').value;
   await generateItems(inputValue);
   console.log(items);
   items = items.replace(/>/g, "<");
   let itemsArray = items.split("<");
   itemsArray = itemsArray.slice(0,2); // TODO: API制限回避のため，最初に5個，1分後にもう5個，というようにする
   await Promise.all(itemsArray.map(async function(item, index){
     await generateImage(index, item);
   }));
   changeFruits();
  
  //await generateImage(inputValue);
  //changeFruits(inputValue);
  alert("画像を変更しました");
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
        fetch("http://localhost:5000/download_image", 
        {method: "POST",body: new URLSearchParams(
          {url: "https://oaidalleapiprodscus.blob.core.windows.net/private/org-Bw1rHVWULCh4tq4NFETZpXuc/user-LED88rKFquAPl9gSpidWoKaO/img-GydALBssEoNy0Qbfy6xdoy3m.png?st=2024-01-20T14%3A42%3A08Z&se=2024-01-20T16%3A42%3A08Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2024-01-19T19%3A37%3A42Z&ske=2024-01-20T19%3A37%3A42Z&sks=b&skv=2021-08-06&sig=ArGvxA0DtGf8tLc0S5PQExdBmMKFEWb14sZUiE1KXXQ%3D",index: "0"}),
        })

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

addFruit();
