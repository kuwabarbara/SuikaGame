from backend import app
from flask import request, jsonify
import urllib.request
import cv2
import numpy as np


sizes = [60, 80, 100, 120, 140, 160, 180, 220, 260, 300, 350]


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
                transparent_image(dst_path)
                print("transparented")
                resize_image(dst_path, sizes[int(ind)])
                print("resized")
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
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        img = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)
        cv2.imwrite(image_path, img)

    except Exception as e:
        print(e)


# 輪郭抽出して背景を透過する関数
def transparent_image(image_path):
    try:
        img = cv2.imread(image_path)
        img = cv2.Canny(img, 100, 200)
        kernel = np.ones((5, 5), np.uint8)
        img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel, iterations=3)
        r = (0.2, 0.7)

        height, width = img.shape[:2]
        base_area = height * width

        contours, hierarchy = cv2.findContours(
            img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
        )

        mask = np.zeros(img.shape, dtype=np.uint8)
        for cont in contours:
            cont_area = cv2.contourArea(cont)
            if cont_area >= base_area * r[0] and cont_area <= base_area * r[1]:
                cv2.fillConvexPoly(mask, cont, color=255)
        img = cv2.imread(image_path)
        img = cv2.cvtColor(img, cv2.COLOR_RGB2RGBA)
        mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2RGBA)
        img[:, :, 3] = np.where(np.all(mask == [0, 0, 0, 255], axis=-1), 0, 255)
        cv2.imwrite(image_path, img)

    except Exception as e:
        print(e)
