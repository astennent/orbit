import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ExplosionEffectProps {
  position: THREE.Vector3
  color: string
  count?: number
  onComplete: () => void
}

export function ExplosionEffect({ position, color, count = 60, onComplete }: ExplosionEffectProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const duration = 1.3 // 1.3 seconds explosion lifetime
  const elapsed = useRef(0)

  // Initialize randomized expanding velocities and positions
  const { positions, velocities, colors } = useMemo(() => {
    const posArr = new Float32Array(count * 3)
    const velArr = new Float32Array(count * 3)
    const colArr = new Float32Array(count * 3)

    const baseColor = new THREE.Color(color)
    const fireColor = new THREE.Color('#ff471a') // Hot fiery orange-red
    const ashColor = new THREE.Color('#1a1a1a')  // Dark ash grey smoke

    for (let i = 0; i < count; i++) {
      // Start exactly at the explosion origin
      posArr[i * 3] = position.x
      posArr[i * 3 + 1] = position.y
      posArr[i * 3 + 2] = position.z

      // Expand outward spherically on the XZ plane with slight vertical lift
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const speed = 1.8 + Math.random() * 5.0

      velArr[i * 3] = Math.sin(phi) * Math.cos(theta) * speed
      velArr[i * 3 + 1] = Math.cos(phi) * speed * 0.45 // Lower vertical spread
      velArr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed

      // Blend from base color to hot fire or dark ash
      const colRand = Math.random()
      const blendedColor = baseColor.clone()
      if (colRand < 0.45) {
        blendedColor.lerp(fireColor, Math.random())
      } else if (colRand < 0.8) {
        blendedColor.lerp(ashColor, Math.random())
      } else {
        blendedColor.multiplyScalar(1.8) // Make some particles super-bright/glowing
      }

      colArr[i * 3] = blendedColor.r
      colArr[i * 3 + 1] = blendedColor.g
      colArr[i * 3 + 2] = blendedColor.b
    }

    return { positions: posArr, velocities: velArr, colors: colArr }
  }, [position, color, count])

  useFrame((_, delta) => {
    elapsed.current += delta
    if (elapsed.current >= duration) {
      onComplete()
      return
    }

    const geo = pointsRef.current.geometry
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array

    // Update particle coordinates based on their velocities and friction drift
    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * delta
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta

      // Apply light friction deceleration to simulate expanding smoke resistance in vacuum
      velocities[i * 3] *= 0.95
      velocities[i * 3 + 1] *= 0.95
      velocities[i * 3 + 2] *= 0.95
    }
    posAttr.needsUpdate = true

    // Dynamically fade out size and opacity as lifetime decays
    const mat = pointsRef.current.material as THREE.PointsMaterial
    const progress = elapsed.current / duration
    mat.opacity = Math.max(0, 1.0 - progress)
    mat.size = Math.max(0, 0.48 * (1.0 - progress * 0.78))
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.4}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={1.0}
      />
    </points>
  )
}
