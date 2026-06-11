import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./state-panels";

describe("EmptyState",()=>{it("explains missing real data",()=>{render(<EmptyState title="没有真实趋势" description="请加入真实来源"/>);expect(screen.getByText("没有真实趋势")).toBeInTheDocument();expect(screen.getByText("请加入真实来源")).toBeInTheDocument();});});
