
// TypeScript equivalent of RangeInclusive<usize>
class RangeInclusive {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

    contains(value: number): boolean {
        return value >= this.start && value <= this.end;
    }

    // Helper to create ranges like Rust's a..=b syntax
    static inclusive(start: number, end: number): RangeInclusive {
        return new RangeInclusive(start, end);
    }
}

// 1:1 translation of Ranges struct
export class Ranges {
    private ranges: RangeInclusive[];

    constructor(ranges: RangeInclusive[]) {
        this.ranges = ranges;
    }

    // 1:1 translation of contains method
    contains(number: number): boolean {
        return this.ranges.some(r => r.contains(number));
    }

    // 1:1 translation of from_str method
    public static from_str(s: string): Ranges {
        const res: RangeInclusive[] = [];

        for (const range of s.split(',')) {
            if (range.includes('-')) {
                const numbers = range.split('-');
                const rstart = numbers[0];
                const rstop = numbers[1];

                // verify rstart, rstop are numbers
                if (rstart !== undefined && rstop !== undefined) {
                    const startNum = parseInt(rstart, 10);
                    const stopNum = parseInt(rstop, 10);
                    
                    if (isNaN(startNum) || isNaN(stopNum)) {
                        throw new Error(`Expected range to be a positive number, got: ${range}`);
                    }
                } else {
                    throw new Error(`Expected range to be a positive number, got: ${range}`);
                }

                if (numbers.length !== 2) {
                    throw new Error(`Expected either a single number or range of numbers, but got: ${range}`);
                }

                if (rstart === undefined || rstop === undefined) {
                    throw new Error(`Expected range to be in the form of \`start-stop\`, got \`${range}\``);
                }

                const startNum = parseInt(rstart, 10);
                const stopNum = parseInt(rstop, 10);
                res.push(RangeInclusive.inclusive(startNum, stopNum));
            } else {
                const r = parseInt(range, 10);
                if (isNaN(r)) {
                    throw new Error(`Expected range to be a positive number, got: ${range}`);
                }
                res.push(RangeInclusive.inclusive(r, r));
            }
        }

        return new Ranges(res);
    }
}

// 1:1 translation of matches_ranges function
export function matches_ranges(value: string): void {
    try {
        Ranges.from_str(value);
    } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
    }
}