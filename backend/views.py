from backend import app
from flask import request, jsonify
import urllib.request
import cv2
import numpy as np


sizes = [33, 48, 61, 69, 89, 114, 129, 156, 177, 220, 259]


@app.route("/")
def index():
    return "Hello World!"


# 画像のURLを受け取ったら、その画像をダウンロードするAPI
@app.route("/download_image", methods=["POST"])
def download_image():
    try:
        if request.method == "POST":
            url = request.form["url"]
            ind = request.form["index"]

            dst_path = "public/base/" + ind + ".png"
            try:
                urllib.request.urlretrieve(url, dst_path)
                print("downloaded")
                resize_image(dst_path, sizes[int(ind)])
                print("resized")
                transparent_image(dst_path)
                print("transparented")
                return jsonify({"result": "OK"})
            except Exception as e:
                print(e)
                return jsonify({"error": f"Error: {e}"})
    except Exception as e:
        print(e)
        return jsonify({"error": f"Error: {e}"})


# 画像を小さくする関数
def resize_image(image_path, size):
    try:
        img = cv2.imread(image_path)
        img = cv2.resize(img, (size, size))
        cv2.imwrite(image_path, img)
    except Exception as e:
        print(e)


# 背景を透過する関数
def transparent_image(image_path):
    try:
        src = cv2.imread(image_path)

        # Point 1: 白色部分に対応するマスク画像を生成
        mask = np.all(src[:, :, :] == [255, 255, 255], axis=-1)

        # Point 2: 元画像をBGR形式からBGRA形式に変換
        dst = cv2.cvtColor(src, cv2.COLOR_BGR2BGRA)

        # Point3: マスク画像をもとに、白色部分を透明化
        dst[mask, 3] = 0

        # png画像として出力
        cv2.imwrite("dst.png", dst)
    except Exception as e:
        print(e)
