/**
 * The other people in the room: a plain capsule body with a nose that shows
 * which way it faces and a name plate that always turns to the viewer.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { net, useStore } from "../net/store";
import { makeTextTexture, textAspect } from "../ui/text";

const PLATE_HEIGHT = 0.22;
/** A seated body is drawn this much lower so its head is at sitting height. */
const SEATED_DROP = 0.4;

function Avatar({ id, name, seated }: { id: string; name: string; seated: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const plate = useRef<Mesh>(null);
  const texture = useMemo(() => makeTextTexture([name], { fontPx: 56 }), [name]);

  useFrame(({ camera }, delta) => {
    const pose = net.getState().poses[id];
    if (!group.current || !body.current || !plate.current) return;
    group.current.visible = pose !== undefined;
    if (!pose) return;
    // Poses arrive ten times a second; easing toward the latest one hides the steps.
    const ease = Math.min(1, delta * 10);
    const { position } = group.current;
    if (Math.hypot(pose.x - position.x, pose.z - position.z) > 3) position.set(pose.x, 0, pose.z);
    else position.set(position.x + (pose.x - position.x) * ease, 0, position.z + (pose.z - position.z) * ease);
    body.current.rotation.y = pose.ry;
    // The world turn: in VR the camera sits inside the rig, which is itself turned. The plate has no turned parent.
    camera.getWorldQuaternion(plate.current.quaternion);
  });

  return (
    <group ref={group} visible={false}>
      <group ref={body} position={[0, seated ? -SEATED_DROP : 0, 0]}>
        <mesh position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.2, 0.9, 4, 12]} />
          <meshStandardMaterial color="#d9a441" />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color="#e8c9a0" />
        </mesh>
        <mesh position={[0, 1.6, -0.19]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.12, 8]} />
          <meshStandardMaterial color="#8a5a2b" />
        </mesh>
      </group>
      <mesh ref={plate} position={[0, seated ? 1.75 : 2.05, 0]} scale={[textAspect(texture) * PLATE_HEIGHT, PLATE_HEIGHT, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={texture} />
      </mesh>
    </group>
  );
}

export function Avatars() {
  const room = useStore((state) => state.room);
  if (!room) return null;
  return (
    <>
      {room.members
        .filter((member) => member.id !== room.you && member.connected)
        .map((member) => (
          <Avatar key={member.id} id={member.id} name={member.name} seated={member.tableId !== null} />
        ))}
    </>
  );
}
