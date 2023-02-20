// Copyright 2021 Tianhuan Lu
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createMultiMaterialObject } from 'three/examples/jsm/utils/SceneUtils.js';
import Stats from "three/examples/jsm/libs/stats.module";
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from "three.meshline";

import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import * as GeometryUtils from "three/examples/jsm/utils/GeometryUtils.js";

const Buffer = require("buffer").Buffer;

export const renderGraphics3D = (elem: HTMLElement) => {
    const sceneData = elem.getAttribute("data") || "";
    const sceneDataHeader = "data:application/json;base64,";
    const sceneJSON = sceneData.startsWith(sceneDataHeader) ? 
        JSON.parse(Buffer.from(sceneData.slice(sceneDataHeader.length), "base64").toString()) :
        null;
    
    console.log(sceneJSON);

    const defaultCanvasWidth = 480;
    const defaultCanvasHeight = 360;
    const canvasWidth = parseFloat(elem.style.width) || defaultCanvasWidth;
    const canvasHeight = parseFloat(elem.style.height) || defaultCanvasHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let renderer = new THREE.WebGLRenderer({
        antialias: false
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvasWidth, canvasHeight);
    elem.appendChild(renderer.domElement);

    const radialFOV = sceneJSON.camera.fov * Math.PI / 180;
    const cameraDistance = sceneJSON.camera.distance;
    let camera = new THREE.PerspectiveCamera(
        Math.atan(Math.tan(radialFOV) / Math.min(1.0,canvasAspect)) / (Math.PI / 180),
        canvasAspect, 0.01 * cameraDistance, 1000 * cameraDistance);
    camera.position.set(...<[number,number,number]>sceneJSON.camera.position);
    camera.lookAt(...<[number,number,number]>sceneJSON.camera.target);
    camera.up = new THREE.Vector3(...<[number,number,number]>sceneJSON.camera.vertical);
    camera.updateProjectionMatrix();

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    
    let scene = new THREE.Scene();

    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);

    const geometry = new THREE.CircleGeometry(1.0, 6);
    // geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array([
    //     1.0, 0.0, 0.0,
    //     0.0, 1.0, 0.0,
    //     0.0, 0.0, 1.0,
    //     1.0, 0.0, 0.0,
    //     0.0, 1.0, 0.0,
    //     0.0, 0.0, 1.0,
    //     1.0, 0.0, 0.0
    // ]), 3));
    geometry.setAttribute('emissive', new THREE.BufferAttribute(new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,
        1.0, 0.0, 0.0
    ]), 3));

    const material = new THREE.MeshPhongMaterial({ vertexColors: true, emissive: 0xff0000 });
    // add embient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const render = () => {
        renderer.render(scene, camera);
    };

    render();

    controls.addEventListener('change', render);
};
