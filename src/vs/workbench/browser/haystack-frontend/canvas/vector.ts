/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

export class Vector {
  constructor(
    public x: number,
    public y: number,
  ) {}

  public static new() {
    return new Vector(0, 0)
  }

  public static min(a: Vector, b: Vector): Vector {
    return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y))
  }

  public static add(a: Vector, b: Vector): Vector {
    return new Vector(a.x + b.x, a.y + b.y)
  }

  public static sub(a: Vector, b: Vector): Vector {
    return new Vector(a.x - b.x, a.y - b.y)
  }

  public static mul(v: Vector, scalar: number) {
    return new Vector(v.x * scalar, v.y * scalar)
  }

  public static dot(u: Vector, v: Vector) {
    return u.x * v.x + u.y * v.y
  }

  public static div(v: Vector, scalar: number) {
    return new Vector(v.x / scalar, v.y / scalar)
  }

  public static normalize(v: Vector) {
    return Vector.div(v, v.mag())
  }

  public static distSquared(a: Vector, b: Vector): number {
    const distX = b.x - a.x
    const distY = b.y - a.y
    return distX * distX + distY * distY
  }

  public add(v: Vector) {
    const result = Vector.add(this, v)
    this.x = result.x
    this.y = result.y
    return this
  }

  public sub(v: Vector) {
    const result = Vector.sub(this, v)
    this.x = result.x
    this.y = result.y
    return this
  }

  public manhattanDistance(): number {
    return this.x + this.y
  }

  public mag(): number {
    return Math.sqrt(this.magSquared())
  }

  public magSquared(): number {
    return this.x * this.x + this.y * this.y
  }

  public mul(scalar: number) {
    this.x *= scalar
    this.y *= scalar
    return this
  }

  public div(scalar: number) {
    this.x /= scalar
    this.y /= scalar
    return this
  }

  public normalize() {
    const magnitude = this.mag()
    this.x /= magnitude
    this.y /= magnitude
    return this
  }

  public project(v: Vector) {
    return Vector.mul(Vector.div(v, v.magSquared()), Vector.dot(this, v))
  }

  public dot(v: Vector) {
    return this.x * v.x + this.y * v.y
  }

  public copy() {
    return new Vector(this.x, this.y)
  }

  public round(): Vector {
    this.x = Math.round(this.x)
    this.y = Math.round(this.y)
    return this
  }

  lerp(v: Vector, alpha: number) {
    this.x += (v.x - this.x) * alpha
    this.y += (v.y - this.y) * alpha

    return this
  }

  lerpVectors(v1: Vector, v2: Vector, alpha: number) {
    this.x = v1.x + (v2.x - v1.x) * alpha
    this.y = v1.y + (v2.y - v1.y) * alpha

    return this
  }

  public static equals(a: Vector, b: Vector): boolean {
    return a.x === b.x && a.y === b.y
  }

  public distanceFrom(from: Vector): number {
    return Vector.sub(this, from).mag()
  }
}
