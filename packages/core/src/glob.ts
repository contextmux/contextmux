/**
 * A small glob matcher.
 *
 * Path scoping is a security-adjacent control, so it uses an explicit scanner rather than a
 * chain of string replacements. Replacement chains need sentinel characters to avoid
 * clobbering their own output, and a sentinel that leaks into the pattern silently changes
 * what the expression matches — which for a deny-list means silently allowing something.
 *
 * Supports `**`, `**\/`, `*`, `?` and `{a,b}` alternation.
 */

function escapeLiteral(ch: string): string {
  return /[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
}

export function globToRegExp(pattern: string): RegExp {
  let out = '^'
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]!

    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          // `**/` matches zero or more leading directories.
          out += '(?:[^/]*\\/)*'
          i += 3
        } else {
          out += '.*'
          i += 2
        }
      } else {
        // A single star never crosses a path separator.
        out += '[^/]*'
        i += 1
      }
      continue
    }

    if (ch === '?') {
      out += '[^/]'
      i += 1
      continue
    }

    if (ch === '{') {
      const close = pattern.indexOf('}', i)
      if (close === -1) {
        out += '\\{'
        i += 1
        continue
      }
      const alternatives = pattern
        .slice(i + 1, close)
        .split(',')
        .map((alt) => alt.split('').map(escapeLiteral).join(''))
      out += `(?:${alternatives.join('|')})`
      i = close + 1
      continue
    }

    out += escapeLiteral(ch)
    i += 1
  }

  return new RegExp(`${out}$`)
}

export function matchGlob(pattern: string, filePath: string): boolean {
  return globToRegExp(pattern).test(filePath)
}

export function matchesAny(patterns: string[], filePath: string): boolean {
  return patterns.some((p) => matchGlob(p, filePath))
}

/**
 * Could two globs ever match the same file?
 *
 * Used to decide whether a path-scoped rule applies to a task whose scope is itself a glob —
 * at that point no files have been chosen, so there is nothing concrete to match against and
 * the question is about the patterns themselves.
 *
 * Deliberately conservative: it returns true unless the two can be *proved* disjoint. Dropping
 * a rule the author expected to be in force is a silent loss of guidance; carrying one that
 * turns out not to apply costs a few hundred characters. The asymmetry decides the default.
 *
 * The proof of disjointness is narrow and sound: walking segment by segment, if both sides
 * have a literal segment at the same position and those literals differ, no path can satisfy
 * both — provided neither side has already used `**`, which absorbs any number of segments and
 * so destroys the alignment the argument depends on.
 */
export function globsOverlap(a: string, b: string): boolean {
  const left = a.split('/')
  const right = b.split('/')
  const wild = (segment: string) => /[*?{[]/.test(segment)

  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const l = left[i]!
    const r = right[i]!

    // `**` matches any number of segments, so everything after it could line up.
    if (l === '**' || r === '**') return true

    if (wild(l) && wild(r)) continue

    // One side is a literal: ask whether the other can actually match it. `tsconfig*.json`
    // looks accommodating but cannot match `test`, and treating any wildcard as a match is how
    // a rule about build config ends up attached to a task about tests.
    if (wild(l)) {
      if (!matchGlob(l, r)) return false
      continue
    }
    if (wild(r)) {
      if (!matchGlob(r, l)) return false
      continue
    }

    if (l !== r) return false
  }

  /*
   * Neither used `**`, so segment counts are fixed and have to agree. `*.md` describes a path
   * of one segment and `src/**` a path of at least two; nothing satisfies both.
   */
  return left.length === right.length
}
