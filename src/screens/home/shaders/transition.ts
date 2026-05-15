import { frag } from "@/utils/skia";

export const particleTransition = frag`
    uniform shader iImage;
    uniform vec2 iSize;
    uniform float iProgress;
    uniform float iSeed;
    uniform float iOpacity;
    uniform float iRadius;
    uniform float iFold;
    uniform float iTime;
    uniform float iBurst;
    uniform float iBurstStartProgress;
    uniform float iCardAreaFadeProgress;
    uniform vec2 iCardOrigin;
    uniform vec2 iCardSize;
    uniform vec2 iStageSize;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33 + iSeed);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec2 hash22(vec2 p) {
      float n = hash12(p);
      return vec2(n, hash12(p + n + 19.19));
    }

    float roundedMask(vec2 p) {
      vec2 q = abs(p - iSize * 0.5) - (iSize * 0.5 - vec2(iRadius));
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - iRadius;
      return 1.0 - smoothstep(0.0, 2.0, d);
    }

    float visiblePixel(vec4 color) {
      float brightness = max(max(color.r, color.g), color.b);
      return step(0.028, brightness) * step(0.02, color.a);
    }

    vec3 straightRGB(vec4 color) {
      return color.rgb / max(color.a, 0.001);
    }

    vec4 premulColor(vec3 rgb, float alpha) {
      float a = clamp(alpha, 0.0, 1.0);
      return vec4(clamp(rgb, vec3(0.0), vec3(1.0)) * a, a);
    }

    vec2 particleSeed(vec2 sourceXY, float cellSize) {
      return floor(sourceXY / cellSize) + vec2(17.3, 41.9);
    }

    vec2 panParticleStage(vec2 sourceXY, float progress, float cellSize) {
      float particleAmount = pow(clamp(progress, 0.0, 1.0), 0.72);
      vec2 fromCenter = sourceXY - iSize * 0.5;
      vec2 dir = fromCenter / max(length(fromCenter), 0.001);
      vec2 seed = particleSeed(sourceXY, cellSize);
      vec2 randomDir = hash22(seed + 8.1) - 0.5;
      randomDir = randomDir / max(length(randomDir), 0.001);
      vec2 tangent = vec2(-dir.y, dir.x);
      float order = hash12(seed);
      float birth = hash12(seed + 91.7) * 0.12;
      float cellProgress = smoothstep(birth, birth + 0.72, particleAmount);
      vec2 drift =
        dir * (10.0 + order * 20.0) +
        tangent * (hash12(seed + 3.7) - 0.5) * 12.0 +
        randomDir * 7.0;
      float spread = mix(0.88, 1.75, particleAmount);
      vec2 particleXY = sourceXY + drift * cellProgress * spread;

      return iCardOrigin + (particleXY / iSize) * iCardSize;
    }

    float burstCurve(float progress) {
      float eased = progress * progress * (3.0 - 2.0 * progress);
      return eased * eased;
    }

    vec2 burstTargetStage(vec2 startStage, vec2 seed) {
      vec2 cardCenter = iCardOrigin + iCardSize * 0.5;
      vec2 radialDir = startStage - cardCenter;
      vec2 randomDir = hash22(seed + 31.7) - 0.5;
      randomDir = randomDir / max(length(randomDir), 0.001);
      radialDir = radialDir / max(length(radialDir), 0.001);

      vec2 targetDir = radialDir * 1.15 + randomDir * 0.72;
      targetDir = targetDir / max(length(targetDir), 0.001);

      float stageSpan = max(iStageSize.x, iStageSize.y);
      float distance = mix(stageSpan * 0.92, stageSpan * 1.62, hash12(seed + 56.2));

      return startStage + targetDir * distance;
    }

    vec4 burstParticle(vec2 xy, float progress, float savedProgress, float fadeProgress, float cellSize) {
      vec2 sourceStage = xy;
      float startProgress = clamp(savedProgress, 0.0, 0.999);
      float startCurve = burstCurve(startProgress);
      float currentCurve = mix(startCurve, 1.0, burstCurve(fadeProgress));
      float travelProgress = clamp(
        (currentCurve - startCurve) / max(1.0 - startCurve, 0.001),
        0.0,
        1.0
      );

      for (int i = 0; i < 5; i++) {
        vec2 sourceXY = (sourceStage - iCardOrigin) / max(iCardSize, vec2(0.001)) * iSize;
        vec2 sourceCell = floor(sourceXY / cellSize);
        vec2 seed = sourceCell + vec2(17.3, 41.9) + iSeed;
        vec2 sourceCenterXY = (sourceCell + vec2(0.5)) * cellSize;
        vec2 originStage = iCardOrigin + (sourceCenterXY / iSize) * iCardSize;
        vec2 startStage = panParticleStage(sourceCenterXY, startProgress, cellSize);
        vec2 targetStage = burstTargetStage(startStage, seed);
        vec2 particleCenter = mix(startStage, targetStage, travelProgress);

        sourceStage = xy - (particleCenter - originStage);
      }

      vec2 sourceXY = (sourceStage - iCardOrigin) / max(iCardSize, vec2(0.001)) * iSize;
      vec2 sourceCell = floor(sourceXY / cellSize);
      vec2 sourceCenterXY = (sourceCell + vec2(0.5)) * cellSize;
      float sourceInside =
        step(0.0, sourceXY.x) *
        step(0.0, sourceXY.y) *
        step(sourceXY.x, iSize.x) *
        step(sourceXY.y, iSize.y) *
        roundedMask(sourceXY);
      vec2 seed = sourceCell + vec2(17.3, 41.9) + iSeed;
      vec2 originStage = iCardOrigin + (sourceCenterXY / iSize) * iCardSize;
      vec2 startStage = panParticleStage(sourceCenterXY, startProgress, cellSize);
      vec2 targetStage = burstTargetStage(startStage, seed);
      vec2 particleCenter = mix(startStage, targetStage, travelProgress);
      float stageCellSize =
        cellSize *
        max(iCardSize.x / max(iSize.x, 1.0), iCardSize.y / max(iSize.y, 1.0));
      vec2 particleLocal = (xy - particleCenter) / max(stageCellSize, 0.001);
      float radius = mix(0.56, 0.18, currentCurve);
      float aa = max(0.045, 0.22 / max(stageCellSize, 1.0));
      float dotMask = 1.0 - smoothstep(radius, radius + aa, length(particleLocal));
      float fadeOut = 1.0 - smoothstep(0.9, 1.0, fadeProgress);
      vec4 color = iImage.eval(sourceXY);
      float visible = visiblePixel(color);
      float alpha =
        color.a *
        sourceInside *
        visible *
        dotMask *
        fadeOut;

      return vec4(straightRGB(color), alpha);
    }

    vec4 panCard(vec2 xy, float cardProgress) {
      float progress = clamp(cardProgress, 0.0, 1.0);
      vec2 cardSize = max(iCardSize, vec2(0.001));
      vec2 cardXY = (xy - iCardOrigin) / cardSize * iSize;
      vec2 uv = cardXY / iSize;
      float fold = clamp(iFold, -1.0, 1.0);

      vec2 centered = uv - vec2(0.5);
      float yDepth = centered.y * fold;
      float perspective = 1.0 + yDepth * 0.54;
      vec2 sourceUv = vec2(
        centered.x / perspective,
        centered.y * (1.0 + abs(fold) * 0.08)
      ) + vec2(0.5);
      vec2 foldedXY = sourceUv * iSize;
      float foldedBounds =
        step(0.0, sourceUv.x) *
        step(0.0, sourceUv.y) *
        step(sourceUv.x, 1.0) *
        step(sourceUv.y, 1.0);
      float baseMask = roundedMask(foldedXY);
      vec4 baseColor = iImage.eval(foldedXY);
      float shade = 1.0 - abs(fold) * 0.16 + fold * centered.y * 0.34;

      if (progress <= 0.001) {
        return premulColor(
          straightRGB(baseColor) * shade,
          baseColor.a * foldedBounds * baseMask * iOpacity
        );
      }

      float particleAmount = pow(progress, 0.72);
      float cellSize = 2.7;

      vec2 fromCenter = cardXY - iSize * 0.5;
      vec2 dir = fromCenter / max(length(fromCenter), 0.001);
      vec2 cell = floor(cardXY / cellSize);
      vec2 seed = cell + vec2(17.3, 41.9);
      vec2 randomDir = hash22(seed + 8.1) - 0.5;
      randomDir = randomDir / max(length(randomDir), 0.001);
      vec2 tangent = vec2(-dir.y, dir.x);
      float order = hash12(seed);
      float birth = hash12(seed + 91.7) * 0.12;
      float cellProgress = smoothstep(birth, birth + 0.72, particleAmount);
      vec2 drift =
        dir * (10.0 + order * 20.0) +
        tangent * (hash12(seed + 3.7) - 0.5) * 12.0 +
        randomDir * 7.0;
      float spread = mix(0.88, 1.75, particleAmount);
      vec2 sourceXY = cardXY - drift * cellProgress * spread;
      float sourceInside =
        step(0.0, sourceXY.x) *
        step(0.0, sourceXY.y) *
        step(sourceXY.x, iSize.x) *
        step(sourceXY.y, iSize.y) *
        roundedMask(sourceXY);
      vec2 particleLocal = fract(sourceXY / cellSize) - 0.5;
      float radius = mix(0.72, 0.32, cellProgress);
      float aa = max(0.045, 0.28 / cellSize);
      float dotMask = 1.0 - smoothstep(radius, radius + aa, length(particleLocal));
      float keep = smoothstep(0.0, 0.24, cellProgress);
      float noiseTime = iTime * 14.0;
      vec2 grainCell = floor(cardXY * 1.7 + seed * 0.37);
      float grain = hash12(grainCell + vec2(101.7 + noiseTime, 43.2 - noiseTime * 0.73));
      float fineGrain = hash12(
        floor(cardXY * 4.8) + seed + vec2(9.4 - noiseTime * 1.31, 71.6 + noiseTime)
      );
      float sizzleGrain = hash12(
        floor(cardXY * 9.4) + seed + vec2(37.2 + noiseTime * 2.1, 14.6 - noiseTime * 1.7)
      );
      float sizzle = smoothstep(0.12, 0.96, sizzleGrain);
      vec2 sampleJitter =
        (hash22(grainCell + vec2(19.8 + noiseTime, 3.4 - noiseTime)) - 0.5) *
        particleAmount *
        3.2;
      vec4 particleColor = iImage.eval(sourceXY + sampleJitter);
      float particleVisible = visiblePixel(particleColor);
      float noiseMask = mix(1.0, mix(0.42, 1.35, grain), particleAmount * 0.92);
      float noiseAlpha = mix(0.36, 1.58, fineGrain);
      float sizzleAlpha = mix(1.0, mix(0.34, 1.64, sizzle), particleAmount * 0.9);
      float particleAlpha = particleColor.a * sourceInside * dotMask * keep * particleAmount * noiseMask * noiseAlpha * 1.68;
      float baseAlpha = baseColor.a * foldedBounds * baseMask * (1.0 - smoothstep(0.0, 0.46, progress));
      float baseVisible = visiblePixel(baseColor);

      if (particleVisible <= 0.0 && baseVisible <= 0.0) {
        return vec4(0.0);
      }

      particleAlpha *= particleVisible;
      baseAlpha *= baseVisible;
      particleAlpha *= sizzleAlpha;
      float alpha = max(baseAlpha, particleAlpha);
      vec3 rgb = mix(
        straightRGB(baseColor),
        straightRGB(particleColor),
        clamp(particleAlpha / max(alpha, 0.001), 0.0, 1.0)
      );
      rgb *= mix(1.0, mix(0.68, 1.26, fineGrain), particleAmount);
      rgb *= mix(1.0, mix(0.66, 1.12, grain), particleAmount * 0.82);
      rgb *= mix(1.0, mix(0.52, 1.36, sizzle), particleAmount * 0.88);
      float dim = mix(1.0, 0.66, particleAmount);
      return premulColor(rgb * shade * dim, alpha * iOpacity);
    }

    vec4 main(vec2 xy) {
      float progress = clamp(iProgress, 0.0, 1.0);

      if (iBurst < 0.5) {
        return panCard(xy, progress);
      }

      float savedProgress = clamp(iBurstStartProgress, 0.0, 0.999);
      float fadeProgress = clamp(iCardAreaFadeProgress, 0.0, 1.0);
      float burstProgress = mix(savedProgress, 1.0, burstCurve(fadeProgress));
      float burstCellSize = 2.9;
      vec4 source = panCard(xy, progress);
      vec4 particle = burstParticle(xy, progress, savedProgress, fadeProgress, burstCellSize);
      float existingParticleAmount = smoothstep(0.015, 0.08, savedProgress);
      float scatter = max(existingParticleAmount, smoothstep(0.0, 0.08, fadeProgress));
      float solidCardBridge =
        (1.0 - smoothstep(0.0, 0.015, savedProgress)) *
        (1.0 - smoothstep(0.0, 0.1, fadeProgress));
      float alpha = particle.a * scatter;
      vec3 rgb = particle.rgb;
      float dim = mix(1.0, 0.78, burstCurve(burstProgress));
      vec4 burst = premulColor(rgb * dim, alpha * iOpacity);
      vec4 heldSource = source * solidCardBridge;

      return burst + heldSource * (1.0 - burst.a);
    }
  `;
