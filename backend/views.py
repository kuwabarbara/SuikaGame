from backend import app
from flask import request, jsonify
import urllib.request
import cv2


sizes = [33, 48, 61, 69, 89, 114, 129, 156, 177, 220, 259]


@app.route("/")
def index():
    return "Hello World!"


# 画像のURLを受け取ったら、その画像をダウンロードするAPI
@app.route("/download_image", methods=["POST"])
def download_image():
    print("start")
    try:
        if request.method == "POST":
            url = request.form["url"]
            ind = request.form["index"]

            dst_path = "public/base/" + ind + ".png"
            try:
                urllib.request.urlretrieve(url, dst_path)
                print("download")
                resize_image(dst_path, sizes[int(ind)])
                print("resize")
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
