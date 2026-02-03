import { Car, GameObject, Rect, Vector } from '../types';
import { PHYSICS, SIZES } from '../constants';

export const getDistance = (v1: Vector, v2: Vector) => {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const normalize = (v: Vector): Vector => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
};

export const dot = (v1: Vector, v2: Vector) => v1.x * v2.x + v1.y * v2.y;

// Circle vs Axis-Aligned Rectangle collision
export const checkCircleRectCollision = (circle: GameObject, rect: Rect) => {
    // Find the closest point to the circle within the rectangle
    const closestX = Math.max(rect.x, Math.min(circle.pos.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circle.pos.y, rect.y + rect.h));

    // Calculate the distance between the circle's center and this closest point
    const dx = circle.pos.x - closestX;
    const dy = circle.pos.y - closestY;

    // If the distance is less than the circle's radius, an intersection occurs
    const distanceSquared = (dx * dx) + (dy * dy);
    return distanceSquared < (circle.radius * circle.radius);
};

export const resolveCircleRectCollision = (circle: GameObject, rect: Rect) => {
    const closestX = Math.max(rect.x, Math.min(circle.pos.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circle.pos.y, rect.y + rect.h));

    const dx = circle.pos.x - closestX;
    const dy = circle.pos.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return; // Prevent divide by zero if center is exactly on edge (rare)

    // Normal vector from closest point to circle center
    const nx = dx / dist;
    const ny = dy / dist;

    // Move circle out of collision
    const overlap = circle.radius - dist;
    circle.pos.x += nx * overlap;
    circle.pos.y += ny * overlap;

    // Bounce velocity
    // Reflect velocity vector across the normal
    // v' = v - 2 * (v . n) * n
    const dotProd = circle.vel.x * nx + circle.vel.y * ny;
    
    // Only bounce if moving towards the wall
    if (dotProd < 0) {
        circle.vel.x = (circle.vel.x - 2 * dotProd * nx) * PHYSICS.BALL_BOUNCE;
        circle.vel.y = (circle.vel.y - 2 * dotProd * ny) * PHYSICS.BALL_BOUNCE;
    }
};

// Check Car vs Ball (Circle vs Circle approximation for arcade feel)
export const checkCircleCircleCollision = (c1: GameObject, c2: GameObject) => {
    const dist = getDistance(c1.pos, c2.pos);
    return dist < c1.radius + c2.radius;
};

export const resolveCarBallCollision = (car: Car, ball: GameObject) => {
    const dist = getDistance(car.pos, ball.pos);
    if (dist === 0) return false;

    // Normal vector from car to ball
    const nx = (ball.pos.x - car.pos.x) / dist;
    const ny = (ball.pos.y - car.pos.y) / dist;

    // Push ball out of car to avoid sticking
    const overlap = (car.radius + ball.radius) - dist;
    ball.pos.x += nx * overlap;
    ball.pos.y += ny * overlap;

    // Transfer momentum
    // Simplified physics: Car imparts velocity to ball based on its speed and direction
    // plus a bounce effect.
    
    // Decompose car velocity onto the normal
    const carSpeedAlongNormal = dot(car.vel, { x: nx, y: ny });
    const ballSpeedAlongNormal = dot(ball.vel, { x: nx, y: ny });

    // If car is moving towards ball (or faster than ball in that direction)
    if (carSpeedAlongNormal > ballSpeedAlongNormal) {
        // Impulse transfer
        const transfer = (carSpeedAlongNormal - ballSpeedAlongNormal) * 1.5; // 1.5 for extra "pop"
        
        ball.vel.x += nx * transfer;
        ball.vel.y += ny * transfer;

        // Slow car down slightly
        car.speed *= 0.8;
        car.vel.x *= 0.8;
        car.vel.y *= 0.8;
        
        return true; // Collision occurred
    }
    return false;
};
