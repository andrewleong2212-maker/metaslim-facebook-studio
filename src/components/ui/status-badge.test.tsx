import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge",()=>{it("renders truthful connection state",()=>{render(<StatusBadge tone="warning">尚未连接</StatusBadge>);expect(screen.getByText("尚未连接")).toBeInTheDocument();});});
