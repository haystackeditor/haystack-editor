/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"

export class Rectangle {
  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
  ) {}

  static fromPositionAndSize(position: Vector, size: Vector): Rectangle {
    return new Rectangle(
      position.x,
      position.y,
      position.x + size.x,
      position.y + size.y,
    )
  }

  get left() {
    return Math.min(this.x1, this.x2)
  }

  get right() {
    return Math.max(this.x1, this.x2)
  }

  get top() {
    return Math.min(this.y1, this.y2)
  }

  get bottom() {
    return Math.max(this.y1, this.y2)
  }

  public delta(v: Vector): void {
    this.x1 += v.x
    this.x2 += v.x
    this.y1 += v.y
    this.y2 += v.y
  }

  public topLeft(): Vector {
    return new Vector(this.left, this.top)
  }

  public topRight(): Vector {
    return new Vector(this.right, this.top)
  }

  public bottomLeft(): Vector {
    return new Vector(this.left, this.bottom)
  }
  public bottomRight(): Vector {
    return new Vector(this.right, this.bottom)
  }

  public intersects(b: Rectangle): boolean {
    return this.intersection(b) != null
  }

  public width(): number {
    return Math.abs(this.right - this.left)
  }

  public height(): number {
    return Math.abs(this.bottom - this.top)
  }

  public center(): Vector {
    return new Vector(
      this.left + this.width() / 2,
      this.top + this.height() / 2,
    )
  }

  public containsPoint(point: Vector): boolean {
    return (
      point.x >= this.left &&
      point.x <= this.right &&
      point.y >= this.top &&
      point.y <= this.bottom
    )
  }

  public containsBounds(bounds: Rectangle): boolean {
    return (
      bounds.left >= this.left &&
      bounds.right <= this.right &&
      bounds.top >= this.top &&
      bounds.bottom <= this.bottom
    )
  }

  public size(): Vector {
    return new Vector(this.width(), this.height())
  }

  public intersection(bounds: Rectangle): Rectangle | null {
    const left = Math.max(this.left, bounds.left)
    const right = Math.min(this.right, bounds.right)
    const top = Math.max(this.top, bounds.top)
    const bottom = Math.min(this.bottom, bounds.bottom)

    if (left < right && top < bottom) {
      return new Rectangle(left, top, right, bottom)
    }

    return null // No intersection
  }

  public union(bounds: Rectangle): Rectangle {
    const left = Math.min(this.left, bounds.left)
    const right = Math.max(this.right, bounds.right)
    const top = Math.min(this.top, bounds.top)
    const bottom = Math.max(this.bottom, bounds.bottom)

    return new Rectangle(left, top, right, bottom)
  }
}
