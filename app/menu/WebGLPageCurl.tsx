"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MenuBookPage } from "../../lib/menuBookPages";
import { updatePageGeometryPositions, type TurnDirection } from "./pageTurnMath";
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
  frontTexture: THREE.Texture;
  width: number;
  height: number;
};

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
    const camera = new THREE.PerspectiveCamera(36, width / height, 1, 4000);
    camera.position.set(0, 0, height * 1.42);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
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

    const frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      side: THREE.FrontSide,
      roughness: 0.78,
      metalness: 0.05,
    });

    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0xead5aa,
      map: frontTexture,
      transparent: true,
      opacity: 0.92,
      side: THREE.BackSide,
      roughness: 0.92,
      metalness: 0.02,
    });

    const frontMesh = new THREE.Mesh(geometry, frontMaterial);
    const backMesh = new THREE.Mesh(geometry, backMaterial);
    scene.add(frontMesh, backMesh);

    const ambient = new THREE.AmbientLight(0xffffff, 0.68);
    const keyLight = new THREE.DirectionalLight(0xfff2d6, 1.05);
    keyLight.position.set(-width * 0.45, height * 0.55, height * 1.1);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.38);
    fillLight.position.set(width * 0.55, -height * 0.25, height * 0.55);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.22);
    rimLight.position.set(0, height * 0.5, -height * 0.4);
    scene.add(ambient, keyLight, fillLight, rimLight);

    stateRef.current = {
      renderer,
      scene,
      camera,
      geometry,
      frontMesh,
      backMesh,
      frontTexture,
      width,
      height,
    };

    renderMesh(stateRef.current);

    const resize = () => {
      const api = stateRef.current;
      if (!api || !host) {
        return;
      }

      const nextWidth = Math.max(1, host.clientWidth);
      const nextHeight = Math.max(1, host.clientHeight);
      if (nextWidth === api.width && nextHeight === api.height) {
        return;
      }

      api.width = nextWidth;
      api.height = nextHeight;
      api.camera.aspect = nextWidth / nextHeight;
      api.camera.updateProjectionMatrix();
      api.camera.position.z = nextHeight * 1.42;
      api.renderer.setSize(nextWidth, nextHeight, false);

      api.geometry.dispose();
      const nextGeometry = new THREE.PlaneGeometry(
        nextWidth,
        nextHeight,
        segmentsX,
        segmentsY,
      );
      api.frontMesh.geometry = nextGeometry;
      api.backMesh.geometry = nextGeometry;
      api.geometry = nextGeometry;
      renderMesh(api);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      frontTexture.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      geometry.dispose();
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
