import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { availableNames, authCodes } from '../rosterAuth';

export interface AnnexureOptions {
  month: number;
  year: number;
  entries: RosterEntry[];
  hourlyRate: number;
  shiftCombinations: Array<{
    id: string;
    combination: string;
    hours: number;
  }>;
}

export class AnnexureGenerator {
  
  /**
   * Format number without trailing zeros and hide if zero
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { authCodes, validateAuthCode, isAdminCode } from '../utils/rosterAuth';
}