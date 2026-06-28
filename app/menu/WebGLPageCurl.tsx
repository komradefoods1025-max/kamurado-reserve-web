"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MenuBookPage } from "../../lib/menuBookPages";
import {
  getTurnShadowOpacity,
  updatePageGeometryPositions,
  type TurnDirection,
} from "./pageTurnMath";
import styles from "./page.module.css";

type WebGLPageCurlProps = {
  page: MenuBookPage;
  direction: TurnDirection;
  progress: number;
  segmentsX: number;
  segmentsY: number;
};

type WebGLPageCurlState = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  geometry: THREE.PlaneGeometry;
  frontMesh: THREE.Mesh;
  backMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  frontTexture: THREE.Texture;
  width: number;
  height: number;
};

function createPaperFiberTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.fillStyle = "#f4e6c4";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 140; i += 1) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(120, 88, 48, ${0.02 + Math.random() * 0.04})`;
    ctx.lineWidth = 0.6 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }

  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * size;
    ctx.strokeStyle = `rgba(96, 68, 36, ${0.015 + Math.random() * 0.03})`;
    ctx.lineWidth = 0.4 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function WebGLPageCurl({
  page,
  direction,
  progress,
  segmentsX,
  segmentsY,
}: WebGLPageCurlProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<WebGLPageCurlState | null>(null);
  const progressRef = useRef(progress);
  const directionRef = useRef(direction);

  progressRef.current = progress;
  directionRef.current = direction;

  const renderMesh = (api: WebGLPageCurlState) => {
    const positions = api.geometry.attributes.position as THREE.BufferAttribute;
    updatePageGeometryPositions(
      positions.array as Float32Array,
      segmentsX,
      segmentsY,
      api.width,
      api.height,
      progressRef.current,
      directionRef.current,
    );
    positions.needsUpdate = true;
    api.geometry.computeVertexNormals();

    const shadowMat = api.shadowMesh.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = getTurnShadowOpacity(progressRef.current);

    api.renderer.render(api.scene, api.camera);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 1, 5000);
    camera.position.set(0, -height * 0.02, height * 1.38);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = styles.webglCanvas;
    host.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      segmentsX,
      segmentsY,
    );

    const loader = new THREE.TextureLoader();
    const frontTexture = loader.load(page.src);
    frontTexture.colorSpace = THREE.SRGBColorSpace;
    frontTexture.minFilter = THREE.LinearFilter;
    frontTexture.magFilter = THREE.LinearFilter;

    const fiberTexture = createPaperFiberTexture();

    const frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      side: THREE.FrontSide,
      roughness: 0.72,
      metalness: 0.03,
    });

    const backMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf2e0b4,
      map: frontTexture,
      bumpMap: fiberTexture,
      bumpScale: 0.018,
      side: THREE.BackSide,
      roughness: 0.96,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
      transmission: 0.14,
      thickness: 1.1,
      ior: 1.28,
      emissive: 0x3d2c14,
      emissiveIntensity: 0.08,
    });

    const frontMesh = new THREE.Mesh(geometry, frontMaterial);
    const backMesh = new THREE.Mesh(geometry, backMaterial);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.88, height * 0.32),
      shadowMaterial,
    );
    shadowMesh.position.set(0, -height * 0.34, -2);
    shadowMesh.rotation.x = -Math.PI * 0.42;

    scene.add(shadowMesh, frontMesh, backMesh);

    const ambient = new THREE.AmbientLight(0xfff8ea, 0.55);
    const keyLight = new THREE.DirectionalLight(0xfff0cc, 1.18);
    keyLight.position.set(-width * 0.35, height * 0.42, height * 1.25);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.32);
    fillLight.position.set(width * 0.42, -height * 0.18, height * 0.65);
    const rimLight = new THREE.DirectionalLight(0xffe8b8, 0.28);
    rimLight.position.set(0, height * 0.15, -height * 0.55);
    const underLight = new THREE.DirectionalLight(0xffd890, 0.16);
    underLight.position.set(0, -height * 0.6, height * 0.35);
    scene.add(ambient, keyLight, fillLight, rimLight, underLight);

    const api: WebGLPageCurlState = {
      renderer,
      scene,
      camera,
      geometry,
      frontMesh,
      backMesh,
      shadowMesh,
      frontTexture,
      width,
      height,
    };
    stateRef.current = api;

    renderMesh(api);

    const resize = () => {
      const current = stateRef.current;
      if (!current || !host) {
        return;
      }

      const nextWidth = Math.max(1, host.clientWidth);
      const nextHeight = Math.max(1, host.clientHeight);
      if (nextWidth === current.width && nextHeight === current.height) {
        return;
      }

      current.width = nextWidth;
      current.height = nextHeight;
      current.camera.aspect = nextWidth / nextHeight;
      current.camera.updateProjectionMatrix();
      current.camera.position.set(0, -nextHeight * 0.02, nextHeight * 1.38);
      current.renderer.setSize(nextWidth, nextHeight, false);

      current.geometry.dispose();
      const nextGeometry = new THREE.PlaneGeometry(
        nextWidth,
        nextHeight,
        segmentsX,
        segmentsY,
      );
      current.frontMesh.geometry = nextGeometry;
      current.backMesh.geometry = nextGeometry;
      current.geometry = nextGeometry;

      const shadowGeo = current.shadowMesh.geometry as THREE.PlaneGeometry;
      shadowGeo.dispose();
      current.shadowMesh.geometry = new THREE.PlaneGeometry(
        nextWidth * 0.88,
        nextHeight * 0.32,
      );
      current.shadowMesh.position.set(0, -nextHeight * 0.34, -2);

      renderMesh(current);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      frontTexture.dispose();
      fiberTexture.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      shadowMaterial.dispose();
      geometry.dispose();
      (shadowMesh.geometry as THREE.BufferGeometry).dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
      stateRef.current = null;
    };
  }, [page.src, segmentsX, segmentsY]);

  useEffect(() => {
    const api = stateRef.current;
    if (!api) {
      return;
    }

    renderMesh(api);
  }, [direction, progress, segmentsX, segmentsY]);

  return <div ref={hostRef} className={styles.webglCurl} aria-hidden />;
}
