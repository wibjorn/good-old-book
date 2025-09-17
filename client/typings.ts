export interface DIAnalysisResult {
    status:              string;
    createdDateTime:     Date;
    lastUpdatedDateTime: Date;
    analyzeResult:       AnalyzeResult;
}

export interface AnalyzeResult {
    apiVersion:      Date;
    modelId:         string;
    stringIndexType: string;
    content:         string;
    pages:           Page[];
    tables:          any[];
    paragraphs:      Paragraph[];
    styles:          any[];
    contentFormat:   string;
    sections:        Section[];
}

export interface Page {
    pageNumber: number;
    angle:      number;
    width:      number;
    height:     number;
    unit:       string;
    words:      Word[];
    lines:      Line[];
    spans:      Span[];
}

export interface Line {
    content: string;
    polygon: number[];
    spans:   Span[];
}

export interface Span {
    offset: number;
    length: number;
}

export interface Word {
    content:    string;
    polygon:    number[];
    confidence: number;
    span:       Span;
}

export interface Paragraph {
    spans:           Span[];
    boundingRegions: BoundingRegion[];
    role?:           string;
    content:         string;
}

export interface BoundingRegion {
    pageNumber: number;
    polygon:    number[];
}

export interface Section {
    spans:    Span[];
    elements: string[];
}
