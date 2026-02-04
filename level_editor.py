#!/usr/bin/env python3
"""
DriveAndPutt Level Editor
A professional level editor with pygame_gui.
Features: Undo/Redo, File operations, Tools, Properties Panel
"""

import pygame
import pygame_gui
from pygame_gui.elements import UIButton, UILabel, UITextEntryLine
from pygame_gui.windows import UIFileDialog, UIConfirmationDialog
import json
import os
import copy
import sys

# Constants matching the game
CANVAS_WIDTH = 1024
CANVAS_HEIGHT = 768
UI_WIDTH = 250
TOOLBAR_HEIGHT = 50
STATUS_BAR_HEIGHT = 30
# Window height must include toolbar and status bar
WINDOW_WIDTH = CANVAS_WIDTH + UI_WIDTH
WINDOW_HEIGHT = TOOLBAR_HEIGHT + CANVAS_HEIGHT + STATUS_BAR_HEIGHT

# Tile types (must match game)
TILE_WALL = 0
TILE_SAND = 1
TILE_WATER = 2

# Colors
COLORS = {
    'background': (34, 139, 34),
    'wall': (139, 69, 19),
    'sand': (238, 214, 175),
    'water': (30, 144, 255),
    'start': (255, 255, 255),
    'hole': (26, 26, 26),
    'selection': (255, 255, 0),
    'handle': (255, 102, 0),
    'grid': (30, 123, 30),
    'toolbar_bg': (45, 45, 45),
    'panel_bg': (60, 60, 60),
}

TOOL_SELECT = 'select'
TOOL_WALL = 'wall'
TOOL_SAND = 'sand'
TOOL_WATER = 'water'
TOOL_START = 'start'
TOOL_HOLE = 'hole'


class LevelEditor:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("DriveAndPutt Level Editor")
        
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        self.clock = pygame.time.Clock()
        
        self.ui_manager = pygame_gui.UIManager((WINDOW_WIDTH, WINDOW_HEIGHT))
        
        # State
        self.current_file = None
        self.level_data = self.new_level_data()
        self.modified = False
        
        # History
        self.undo_stack = []
        self.redo_stack = []
        
        self.current_tool = TOOL_SELECT
        self.selected_object = None
        
        self.drag_start = None
        self.drag_creating = False
        self.drag_moving = False
        self.drag_resizing = False
        self.resize_handle = None
        self.drag_offset = (0, 0)
        
        self.file_dialog = None
        self.confirm_dialog = None
        self.pending_action = None
        
        self.status_text = "Ready - Open a level or create a new one"
        
        self.setup_ui()
    
    def new_level_data(self, level_id=1):
        return {
            "id": level_id,
            "name": "New Level",
            "par": 4,
            "walls": [],
            "sandTraps": [],
            "water": [],
            "startPos": {"x": 100, "y": 384},
            "holePos": {"x": 900, "y": 384}
        }
    
    def setup_ui(self):
        # Toolbar buttons
        btn_w = 60
        btn_h = 35
        margin = 5
        y = 7
        x_pos = margin
        
        self.btn_new = UIButton(
            relative_rect=pygame.Rect(x_pos, y, btn_w, btn_h),
            text='New',
            manager=self.ui_manager
        )
        x_pos += btn_w + margin
        
        self.btn_open = UIButton(
            relative_rect=pygame.Rect(x_pos, y, btn_w, btn_h),
            text='Open',
            manager=self.ui_manager
        )
        x_pos += btn_w + margin
        
        self.btn_save = UIButton(
            relative_rect=pygame.Rect(x_pos, y, btn_w, btn_h),
            text='Save',
            manager=self.ui_manager
        )
        x_pos += btn_w + margin
        
        self.btn_save_as = UIButton(
            relative_rect=pygame.Rect(x_pos, y, 70, btn_h), # "Save As" needs more width
            text='Save As',
            manager=self.ui_manager
        )
        x_pos += 70 + margin + 20 # Extra spacer
        
        # Undo/Redo
        self.btn_undo = UIButton(
            relative_rect=pygame.Rect(x_pos, y, btn_w, btn_h),
            text='Undo',
            manager=self.ui_manager
        )
        x_pos += btn_w + margin
        
        self.btn_redo = UIButton(
            relative_rect=pygame.Rect(x_pos, y, btn_w, btn_h),
            text='Redo',
            manager=self.ui_manager
        )
        x_pos += btn_w + margin + 20
        
        # Tool buttons in toolbar
        tools = [
            (TOOL_SELECT, "Select"),
            (TOOL_WALL, "Wall"),
            (TOOL_SAND, "Sand"),
            (TOOL_WATER, "Water"),
            (TOOL_START, "Start"),
            (TOOL_HOLE, "Hole"),
        ]
        
        self.tool_buttons = {}
        for i, (tool_id, name) in enumerate(tools):
            btn = UIButton(
                relative_rect=pygame.Rect(x_pos + i * (60 + margin), y, 60, btn_h),
                text=name,
                manager=self.ui_manager
            )
            self.tool_buttons[tool_id] = btn
        
        # Right panel - Properties
        panel_x = CANVAS_WIDTH
        panel_y = TOOLBAR_HEIGHT
        panel_w = UI_WIDTH
        
        # Level settings
        y_offset = panel_y + 20
        
        UILabel(
            relative_rect=pygame.Rect(panel_x + 10, y_offset, 80, 25),
            text='Level Name:',
            manager=self.ui_manager
        )
        self.name_entry = UITextEntryLine(
            relative_rect=pygame.Rect(panel_x + 10, y_offset + 25, panel_w - 20, 30),
            manager=self.ui_manager
        )
        self.name_entry.set_text(self.level_data['name'])
        
        y_offset += 70
        
        UILabel(
            relative_rect=pygame.Rect(panel_x + 10, y_offset, 50, 25),
            text='Par:',
            manager=self.ui_manager
        )
        self.par_entry = UITextEntryLine(
            relative_rect=pygame.Rect(panel_x + 60, y_offset, 60, 30),
            manager=self.ui_manager
        )
        self.par_entry.set_text(str(self.level_data['par']))
        
        UILabel(
            relative_rect=pygame.Rect(panel_x + 130, y_offset, 50, 25),
            text='ID:',
            manager=self.ui_manager
        )
        self.id_entry = UITextEntryLine(
            relative_rect=pygame.Rect(panel_x + 170, y_offset, 60, 30),
            manager=self.ui_manager
        )
        self.id_entry.set_text(str(self.level_data['id']))
        
        y_offset += 60
        
        # Separator
        UILabel(
            relative_rect=pygame.Rect(panel_x + 10, y_offset, panel_w - 20, 25),
            text='─── Selected Object ───',
            manager=self.ui_manager
        )
        y_offset += 35
        
        self.obj_type_label = UILabel(
            relative_rect=pygame.Rect(panel_x + 10, y_offset, panel_w - 20, 25),
            text='Type: None',
            manager=self.ui_manager
        )
        y_offset += 30
        
        # Property entries
        self.prop_labels = {}
        self.prop_entries = {}
        props = [('x', 'X:'), ('y', 'Y:'), ('w', 'W:'), ('h', 'H:')]
        
        for i, (key, label) in enumerate(props):
            col = i % 2
            row = i // 2
            lx = panel_x + 10 + col * 120
            ly = y_offset + row * 35
            
            self.prop_labels[key] = UILabel(
                relative_rect=pygame.Rect(lx, ly, 30, 25),
                text=label,
                manager=self.ui_manager
            )
            self.prop_entries[key] = UITextEntryLine(
                relative_rect=pygame.Rect(lx + 30, ly, 80, 30),
                manager=self.ui_manager
            )
        
        y_offset += 80
        
        self.btn_delete = UIButton(
            relative_rect=pygame.Rect(panel_x + 10, y_offset, panel_w - 20, 35),
            text='Delete Selected',
            manager=self.ui_manager
        )
        
        y_offset += 50
        
        # Help text
        help_texts = [
            "─── Instructions ───",
            "• Undo: Ctrl+Z",
            "• Redo: Ctrl+Y",
            "• Select tool to pick objects",
            "• Drag edges to resize",
            "• Click to place Start/Hole",
        ]
        
        for text in help_texts:
            UILabel(
                relative_rect=pygame.Rect(panel_x + 10, y_offset, panel_w - 20, 20),
                text=text,
                manager=self.ui_manager
            )
            y_offset += 22
    
    # --- Undo / Redo System ---
    def push_state(self, destructive=True):
        """Save state BEFORE a change is made."""
        # Clean redo stack on new branch
        if destructive:
            self.redo_stack = []
            
        # Limit history
        if len(self.undo_stack) > 50:
            self.undo_stack.pop(0)
            
        self.undo_stack.append(copy.deepcopy(self.level_data))
        self.update_buttons()
    
    def undo(self):
        if not self.undo_stack:
            self.status_text = "Nothing to undo"
            return
            
        # Save current state to redo
        self.redo_stack.append(copy.deepcopy(self.level_data))
        
        # Restore state
        self.level_data = self.undo_stack.pop()
        self.selected_object = None # Clear selection to avoid index errors
        self.mark_modified()
        self.update_properties_panel()
        self.status_text = "Undone last action"
        self.update_buttons()

    def redo(self):
        if not self.redo_stack:
            self.status_text = "Nothing to redo"
            return
            
        # Save current to undo
        self.undo_stack.append(copy.deepcopy(self.level_data))
        
        # Restore state
        self.level_data = self.redo_stack.pop()
        self.selected_object = None
        self.mark_modified()
        self.update_properties_panel()
        self.status_text = "Redone last action"
        self.update_buttons()
        
    def update_buttons(self):
        if not self.undo_stack:
            self.btn_undo.disable()
        else:
            self.btn_undo.enable()
            
        if not self.redo_stack:
            self.btn_redo.disable()
        else:
            self.btn_redo.enable()

    def select_tool(self, tool):
        self.current_tool = tool
        self.selected_object = None
        self.update_properties_panel()
        self.status_text = f"Tool: {tool.capitalize()}"
    
    def update_properties_panel(self):
        # Update level settings from data
        self.name_entry.set_text(self.level_data.get('name', ''))
        self.par_entry.set_text(str(self.level_data.get('par', 4)))
        self.id_entry.set_text(str(self.level_data.get('id', 1)))
        
        if self.selected_object is None:
            self.obj_type_label.set_text("Type: None")
            for key in self.prop_entries:
                self.prop_entries[key].set_text("")
            return
        
        obj_type, index = self.selected_object
        
        if obj_type == 'start':
            self.obj_type_label.set_text("Type: Start Position")
            pos = self.level_data['startPos']
            self.prop_entries['x'].set_text(str(int(pos['x'])))
            self.prop_entries['y'].set_text(str(int(pos['y'])))
            self.prop_entries['w'].set_text("")
            self.prop_entries['h'].set_text("")
        elif obj_type == 'hole':
            self.obj_type_label.set_text("Type: Hole Position")
            pos = self.level_data['holePos']
            self.prop_entries['x'].set_text(str(int(pos['x'])))
            self.prop_entries['y'].set_text(str(int(pos['y'])))
            self.prop_entries['w'].set_text("")
            self.prop_entries['h'].set_text("")
        else:
            coll = self.get_collection(obj_type)
            if index < len(coll):
                obj = coll[index]
                self.obj_type_label.set_text(f"Type: {obj_type.capitalize()}")
                self.prop_entries['x'].set_text(str(int(obj['x'])))
                self.prop_entries['y'].set_text(str(int(obj['y'])))
                self.prop_entries['w'].set_text(str(int(obj['w'])))
                self.prop_entries['h'].set_text(str(int(obj['h'])))
    
    def get_collection(self, obj_type):
        if obj_type == 'wall':
            return self.level_data['walls']
        elif obj_type == 'sand':
            return self.level_data['sandTraps']
        elif obj_type == 'water':
            return self.level_data['water']
        return []
    
    def apply_property_changes(self):
        # We should push state before property change if values are diff
        # But this function is called per char or finish? 
        # Ideally only on finish. The event UI_TEXT_ENTRY_FINISHED handles that.
        # But we need to compare to verify change.
        
        # For layout simplicity, let's just push state always when "Finished" editing.
        self.push_state()
        
        # Apply level settings
        try:
            self.level_data['name'] = self.name_entry.get_text()
            self.level_data['par'] = int(self.par_entry.get_text())
            self.level_data['id'] = int(self.id_entry.get_text())
        except ValueError:
            pass
        
        # Apply selected object props
        if self.selected_object is None:
            return
        
        obj_type, index = self.selected_object
        
        try:
            val_x = int(self.prop_entries['x'].get_text())
            val_y = int(self.prop_entries['y'].get_text())
            
            if obj_type == 'start':
                self.level_data['startPos']['x'] = val_x
                self.level_data['startPos']['y'] = val_y
            elif obj_type == 'hole':
                self.level_data['holePos']['x'] = val_x
                self.level_data['holePos']['y'] = val_y
            else:
                coll = self.get_collection(obj_type)
                if index < len(coll):
                    coll[index]['x'] = val_x
                    coll[index]['y'] = val_y
                    if self.prop_entries['w'].get_text():
                        coll[index]['w'] = int(self.prop_entries['w'].get_text())
                    if self.prop_entries['h'].get_text():
                        coll[index]['h'] = int(self.prop_entries['h'].get_text())
            
            self.mark_modified()
        except ValueError:
            pass
    
    def mark_modified(self):
        self.modified = True
        self.update_title()
    
    def update_title(self):
        title = "DriveAndPutt Level Editor"
        if self.current_file:
            title += f" - {os.path.basename(self.current_file)}"
        if self.modified:
            title += " *"
        pygame.display.set_caption(title)
    
    # File operations
    def new_file(self):
        if self.modified:
            self.pending_action = 'new'
            self.confirm_dialog = UIConfirmationDialog(
                rect=pygame.Rect(WINDOW_WIDTH//2 - 150, WINDOW_HEIGHT//2 - 75, 300, 150),
                manager=self.ui_manager,
                action_long_desc="You have unsaved changes. Discard them?",
                window_title="Unsaved Changes"
            )
        else:
            self._do_new()
    
    def _do_new(self):
        self.push_state() # Actually new file clears history usually but we can keep it? Standard is clear.
        self.undo_stack = []
        self.redo_stack = []
        self.update_buttons()
        
        self.level_data = self.new_level_data()
        self.current_file = None
        self.modified = False
        self.selected_object = None
        self.update_properties_panel()
        self.update_title()
        self.status_text = "New level created"
    
    def open_file(self):
        if self.modified:
            self.pending_action = 'open'
            self.confirm_dialog = UIConfirmationDialog(
                rect=pygame.Rect(WINDOW_WIDTH//2 - 150, WINDOW_HEIGHT//2 - 75, 300, 150),
                manager=self.ui_manager,
                action_long_desc="You have unsaved changes. Discard them?",
                window_title="Unsaved Changes"
            )
        else:
            self._do_open()
    
    def _do_open(self):
        levels_dir = os.path.join(os.getcwd(), "levels")
        self.file_dialog = UIFileDialog(
            rect=pygame.Rect(100, 100, 500, 400),
            manager=self.ui_manager,
            window_title="Open Level",
            initial_file_path=levels_dir,
            allow_picking_directories=False
        )
        self.pending_action = 'open_file'
    
    def save_file(self):
        if self.current_file:
            self._save_to_file(self.current_file)
        else:
            self.save_file_as()
    
    def save_file_as(self):
        levels_dir = os.path.join(os.getcwd(), "levels")
        self.file_dialog = UIFileDialog(
            rect=pygame.Rect(100, 100, 500, 400),
            manager=self.ui_manager,
            window_title="Save Level As",
            initial_file_path=levels_dir,
            allow_picking_directories=False
        )
        self.pending_action = 'save_file'
    
    def _save_to_file(self, filepath):
        try:
            with open(filepath, 'w') as f:
                json.dump(self.level_data, f, indent=4)
            self.current_file = filepath
            self.modified = False
            self.update_title()
            self.status_text = f"Saved: {os.path.basename(filepath)}"
        except Exception as e:
            self.status_text = f"Error saving: {e}"
    
    def _load_file(self, filepath):
        try:
            with open(filepath, 'r') as f:
                self.level_data = json.load(f)
            self.current_file = filepath
            self.modified = False
            self.selected_object = None
            
            # Clear history on load
            self.undo_stack = []
            self.redo_stack = []
            self.update_buttons()
            
            self.update_properties_panel()
            self.update_title()
            self.status_text = f"Opened: {os.path.basename(filepath)}"
        except Exception as e:
            self.status_text = f"Error loading: {e}"
    
    def delete_selected(self):
        if self.selected_object is None:
            return
        
        obj_type, index = self.selected_object
        
        if obj_type in ('start', 'hole'):
            self.status_text = "Cannot delete start or hole position"
            return
        
        self.push_state()
        
        coll = self.get_collection(obj_type)
        if index < len(coll):
            coll.pop(index)
            self.selected_object = None
            self.mark_modified()
            self.update_properties_panel()
            self.status_text = f"Deleted {obj_type}"
    
    # Drawing
    def draw(self):
        # Clear screen
        self.screen.fill(COLORS['toolbar_bg'])
        
        # Draw canvas area
        canvas_rect = pygame.Rect(0, TOOLBAR_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT)
        pygame.draw.rect(self.screen, COLORS['background'], canvas_rect)
        
        # Draw grid
        for x in range(0, CANVAS_WIDTH, 50):
            pygame.draw.line(self.screen, COLORS['grid'], 
                           (x, TOOLBAR_HEIGHT), (x, TOOLBAR_HEIGHT + CANVAS_HEIGHT), 1)
        for y in range(TOOLBAR_HEIGHT, TOOLBAR_HEIGHT + CANVAS_HEIGHT, 50):
            pygame.draw.line(self.screen, COLORS['grid'], (0, y), (CANVAS_WIDTH, y), 1)
        
        # Draw water (bottom layer)
        for i, w in enumerate(self.level_data.get('water', [])):
            self.draw_rect(w, COLORS['water'], ('water', i))
        
        # Draw sand
        for i, s in enumerate(self.level_data.get('sandTraps', [])):
            self.draw_rect(s, COLORS['sand'], ('sand', i))
        
        # Draw walls
        for i, wall in enumerate(self.level_data.get('walls', [])):
            self.draw_rect(wall, COLORS['wall'], ('wall', i))
        
        # Draw hole
        hp = self.level_data.get('holePos', {'x': 900, 'y': 384})
        hy = hp['y'] + TOOLBAR_HEIGHT
        pygame.draw.circle(self.screen, COLORS['hole'], (int(hp['x']), int(hy)), 15)
        pygame.draw.circle(self.screen, (0, 0, 0), (int(hp['x']), int(hy)), 15, 2)
        if self.selected_object == ('hole', 0):
            pygame.draw.circle(self.screen, COLORS['selection'], (int(hp['x']), int(hy)), 18, 2)
        
        # Draw start
        sp = self.level_data.get('startPos', {'x': 100, 'y': 384})
        sy = sp['y'] + TOOLBAR_HEIGHT
        pygame.draw.circle(self.screen, COLORS['start'], (int(sp['x']), int(sy)), 12)
        pygame.draw.circle(self.screen, (0, 0, 0), (int(sp['x']), int(sy)), 12, 2)
        if self.selected_object == ('start', 0):
            pygame.draw.circle(self.screen, COLORS['selection'], (int(sp['x']), int(sy)), 15, 2)
        
        # Draw drag preview
        if self.drag_creating and self.drag_start:
            mx, my = pygame.mouse.get_pos()
            x1, y1 = self.drag_start
            x2, y2 = mx, my
            
            if x2 < x1:
                x1, x2 = x2, x1
            if y2 < y1:
                y1, y2 = y2, y1
            
            color = COLORS.get(self.current_tool, (255, 0, 255))
            rect = pygame.Rect(x1, y1, x2 - x1, y2 - y1)
            s = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
            s.fill((*color, 128))
            self.screen.blit(s, rect.topleft)
            pygame.draw.rect(self.screen, (0, 0, 0), rect, 2)
        
        # Draw right panel background
        # It covers from (CANVAS_WIDTH, 0) to corner
        panel_rect = pygame.Rect(CANVAS_WIDTH, 0, UI_WIDTH, WINDOW_HEIGHT - STATUS_BAR_HEIGHT)
        pygame.draw.rect(self.screen, COLORS['panel_bg'], panel_rect)
        
        # Draw status bar
        status_rect = pygame.Rect(0, WINDOW_HEIGHT - STATUS_BAR_HEIGHT, WINDOW_WIDTH, STATUS_BAR_HEIGHT)
        pygame.draw.rect(self.screen, COLORS['toolbar_bg'], status_rect)
        font = pygame.font.SysFont("Arial", 14)
        text = font.render(self.status_text, True, (200, 200, 200))
        self.screen.blit(text, (10, WINDOW_HEIGHT - 22))
        
        # Draw UI
        self.ui_manager.draw_ui(self.screen)
    
    def draw_rect(self, rect, color, obj_ref):
        x, y = rect['x'], rect['y'] + TOOLBAR_HEIGHT
        w, h = rect['w'], rect['h']
        
        pygame.draw.rect(self.screen, color, (x, y, w, h))
        pygame.draw.rect(self.screen, (0, 0, 0), (x, y, w, h), 1)
        
        if self.selected_object == obj_ref:
            # Selection border
            pygame.draw.rect(self.screen, COLORS['selection'], (x - 2, y - 2, w + 4, h + 4), 2)
            
            # Resize handles
            hs = 8
            handles = [
                (x - hs//2, y - hs//2),
                (x + w//2 - hs//2, y - hs//2),
                (x + w - hs//2, y - hs//2),
                (x + w - hs//2, y + h//2 - hs//2),
                (x + w - hs//2, y + h - hs//2),
                (x + w//2 - hs//2, y + h - hs//2),
                (x - hs//2, y + h - hs//2),
                (x - hs//2, y + h//2 - hs//2),
            ]
            
            for hx, hy in handles:
                pygame.draw.rect(self.screen, COLORS['handle'], (hx, hy, hs, hs))
                pygame.draw.rect(self.screen, (0, 0, 0), (hx, hy, hs, hs), 1)
    
    # Mouse handling
    def handle_mouse_down(self, pos):
        mx, my = pos
        
        # Only handle clicks in canvas area
        if mx >= CANVAS_WIDTH or my < TOOLBAR_HEIGHT or my > TOOLBAR_HEIGHT + CANVAS_HEIGHT:
            return
        
        # Adjust for toolbar offset
        canvas_y = my - TOOLBAR_HEIGHT
        
        if self.current_tool == TOOL_SELECT:
            # Check resize handles first
            if self.selected_object and self.selected_object[0] not in ('start', 'hole'):
                handle = self.get_handle_at(mx, my)
                if handle is not None:
                    self.push_state() # Save before modification
                    self.drag_resizing = True
                    self.resize_handle = handle
                    self.drag_start = (mx, my)
                    return
            
            # Check for selection
            obj = self.get_object_at(mx, canvas_y)
            if obj:
                self.selected_object = obj
                self.update_properties_panel()
                
                self.push_state() # Save before move
                self.drag_moving = True
                self.drag_start = (mx, my)
                
                obj_type, index = obj
                if obj_type == 'start':
                    pos = self.level_data['startPos']
                    self.drag_offset = (pos['x'] - mx, pos['y'] - canvas_y)
                elif obj_type == 'hole':
                    pos = self.level_data['holePos']
                    self.drag_offset = (pos['x'] - mx, pos['y'] - canvas_y)
                else:
                    coll = self.get_collection(obj_type)
                    if index < len(coll):
                        rect = coll[index]
                        self.drag_offset = (rect['x'] - mx, rect['y'] - canvas_y)
            else:
                if self.selected_object:
                    self.selected_object = None
                    self.update_properties_panel()
        
        elif self.current_tool in (TOOL_WALL, TOOL_SAND, TOOL_WATER):
            self.push_state()
            self.drag_creating = True
            self.drag_start = (mx, my)
        
        elif self.current_tool == TOOL_START:
            self.push_state()
            self.level_data['startPos'] = {'x': mx, 'y': canvas_y}
            self.mark_modified()
            self.status_text = f"Placed start at ({mx}, {canvas_y})"
        
        elif self.current_tool == TOOL_HOLE:
            self.push_state()
            self.level_data['holePos'] = {'x': mx, 'y': canvas_y}
            self.mark_modified()
            self.status_text = f"Placed hole at ({mx}, {canvas_y})"
    
    def handle_mouse_drag(self, pos):
        if not self.drag_start:
            return
        
        mx, my = pos
        canvas_y = my - TOOLBAR_HEIGHT
        
        if self.drag_moving and self.selected_object:
            obj_type, index = self.selected_object
            
            new_x = mx + self.drag_offset[0]
            new_y = canvas_y + self.drag_offset[1]
            
            if obj_type == 'start':
                self.level_data['startPos']['x'] = new_x
                self.level_data['startPos']['y'] = new_y
            elif obj_type == 'hole':
                self.level_data['holePos']['x'] = new_x
                self.level_data['holePos']['y'] = new_y
            else:
                coll = self.get_collection(obj_type)
                if index < len(coll):
                    coll[index]['x'] = new_x
                    coll[index]['y'] = new_y
            
            self.mark_modified()
            self.update_properties_panel()
        
        elif self.drag_resizing and self.selected_object:
            obj_type, index = self.selected_object
            coll = self.get_collection(obj_type)
            if index < len(coll):
                rect = coll[index]
                dx = mx - self.drag_start[0]
                dy = my - self.drag_start[1]
                self.drag_start = (mx, my)
                
                handle = self.resize_handle
                
                if handle in (0, 6, 7):
                    rect['x'] += dx
                    rect['w'] -= dx
                if handle in (2, 3, 4):
                    rect['w'] += dx
                if handle in (0, 1, 2):
                    rect['y'] += dy
                    rect['h'] -= dy
                if handle in (4, 5, 6):
                    rect['h'] += dy
                
                if rect['w'] < 10:
                    rect['w'] = 10
                if rect['h'] < 10:
                    rect['h'] = 10
                
                self.mark_modified()
                self.update_properties_panel()
    
    def handle_mouse_up(self, pos):
        if self.drag_creating and self.drag_start:
            mx, my = pos
            x1, y1 = self.drag_start
            x2, y2 = mx, my
            
            # Adjust for toolbar
            y1 -= TOOLBAR_HEIGHT
            y2 -= TOOLBAR_HEIGHT
            
            if x2 < x1:
                x1, x2 = x2, x1
            if y2 < y1:
                y1, y2 = y2, y1
            
            w = x2 - x1
            h = y2 - y1
            
            if w > 5 and h > 5:
                if self.current_tool == TOOL_WALL:
                    self.level_data['walls'].append({'x': x1, 'y': y1, 'w': w, 'h': h, 'type': TILE_WALL})
                    self.status_text = f"Created wall ({w}x{h})"
                elif self.current_tool == TOOL_SAND:
                    self.level_data['sandTraps'].append({'x': x1, 'y': y1, 'w': w, 'h': h, 'type': TILE_SAND})
                    self.status_text = f"Created sand trap ({w}x{h})"
                elif self.current_tool == TOOL_WATER:
                    self.level_data['water'].append({'x': x1, 'y': y1, 'w': w, 'h': h, 'type': TILE_WATER})
                    self.status_text = f"Created water hazard ({w}x{h})"
                
                self.mark_modified()
        
        # If we were moving or resizing, we need to check if anything actually changed
        # Optimization: We pushed state on MouseDown. If no change, we could pop?
        # But comparing states is expensive-ish. Extra history state is fine.
        
        self.drag_start = None
        self.drag_creating = False
        self.drag_moving = False
        self.drag_resizing = False
        self.resize_handle = None
    
    def get_object_at(self, mx, my):
        # Check start
        sp = self.level_data.get('startPos', {'x': 100, 'y': 384})
        if (mx - sp['x'])**2 + (my - sp['y'])**2 < 225:
            return ('start', 0)
        
        # Check hole
        hp = self.level_data.get('holePos', {'x': 900, 'y': 384})
        if (mx - hp['x'])**2 + (my - hp['y'])**2 < 225:
            return ('hole', 0)
        
        # Check rects (reverse for top-first)
        for i in range(len(self.level_data.get('walls', [])) - 1, -1, -1):
            r = self.level_data['walls'][i]
            if r['x'] <= mx <= r['x'] + r['w'] and r['y'] <= my <= r['y'] + r['h']:
                return ('wall', i)
        
        for i in range(len(self.level_data.get('sandTraps', [])) - 1, -1, -1):
            r = self.level_data['sandTraps'][i]
            if r['x'] <= mx <= r['x'] + r['w'] and r['y'] <= my <= r['y'] + r['h']:
                return ('sand', i)
        
        for i in range(len(self.level_data.get('water', [])) - 1, -1, -1):
            r = self.level_data['water'][i]
            if r['x'] <= mx <= r['x'] + r['w'] and r['y'] <= my <= r['y'] + r['h']:
                return ('water', i)
        
        return None
    
    def get_handle_at(self, mx, my):
        if not self.selected_object:
            return None
        
        obj_type, index = self.selected_object
        if obj_type in ('start', 'hole'):
            return None
        
        coll = self.get_collection(obj_type)
        if index >= len(coll):
            return None
        
        rect = coll[index]
        x, y = rect['x'], rect['y'] + TOOLBAR_HEIGHT
        w, h = rect['w'], rect['h']
        
        hs = 8
        handles = [
            (x - hs//2, y - hs//2),
            (x + w//2 - hs//2, y - hs//2),
            (x + w - hs//2, y - hs//2),
            (x + w - hs//2, y + h//2 - hs//2),
            (x + w - hs//2, y + h - hs//2),
            (x + w//2 - hs//2, y + h - hs//2),
            (x - hs//2, y + h - hs//2),
            (x - hs//2, y + h//2 - hs//2),
        ]
        
        for i, (hx, hy) in enumerate(handles):
            if hx <= mx <= hx + hs and hy <= my <= hy + hs:
                return i
        
        return None
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                if self.modified:
                    self.pending_action = 'quit'
                    self.confirm_dialog = UIConfirmationDialog(
                        rect=pygame.Rect(WINDOW_WIDTH//2 - 150, WINDOW_HEIGHT//2 - 75, 300, 150),
                        manager=self.ui_manager,
                        action_long_desc="You have unsaved changes. Quit anyway?",
                        window_title="Unsaved Changes"
                    )
                else:
                    return False
            
            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    self.handle_mouse_down(event.pos)
            
            if event.type == pygame.MOUSEMOTION:
                if pygame.mouse.get_pressed()[0]:
                    self.handle_mouse_drag(event.pos)
            
            if event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1:
                    self.handle_mouse_up(event.pos)
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_DELETE or event.key == pygame.K_BACKSPACE:
                    self.delete_selected()
                
                # Undo/Redo Shortcuts
                is_ctrl = (event.mod & pygame.KMOD_CTRL) or (event.mod & pygame.KMOD_META)
                is_shift = (event.mod & pygame.KMOD_SHIFT)
                
                if is_ctrl and not is_shift and event.key == pygame.K_z:
                    self.undo()
                elif (is_ctrl and is_shift and event.key == pygame.K_z) or (is_ctrl and event.key == pygame.K_y):
                    self.redo()

            if event.type == pygame_gui.UI_BUTTON_PRESSED:
                if event.ui_element == self.btn_new:
                    self.new_file()
                elif event.ui_element == self.btn_open:
                    self.open_file()
                elif event.ui_element == self.btn_save:
                    self.save_file()
                elif event.ui_element == self.btn_save_as:
                    self.save_file_as()
                elif event.ui_element == self.btn_undo:
                    self.undo()
                elif event.ui_element == self.btn_redo:
                    self.redo()
                elif event.ui_element == self.btn_delete:
                    self.delete_selected()
                else:
                    for tool_id, btn in self.tool_buttons.items():
                        if event.ui_element == btn:
                            self.select_tool(tool_id)
                            break
            
            if event.type == pygame_gui.UI_FILE_DIALOG_PATH_PICKED:
                if self.pending_action == 'open_file':
                    self._load_file(event.text)
                elif self.pending_action == 'save_file':
                    filepath = event.text
                    if not filepath.endswith('.json'):
                        filepath += '.json'
                    self._save_to_file(filepath)
                self.file_dialog = None
                self.pending_action = None
            
            if event.type == pygame_gui.UI_CONFIRMATION_DIALOG_CONFIRMED:
                verified_action = self.pending_action
                self.confirm_dialog = None
                self.pending_action = None
                
                if verified_action == 'new':
                    self._do_new()
                elif verified_action == 'open':
                    self._do_open()
                elif verified_action == 'quit':
                    return False
            
            if event.type == pygame_gui.UI_WINDOW_CLOSE:
                self.file_dialog = None
                self.confirm_dialog = None
                self.pending_action = None
            
            if event.type == pygame_gui.UI_TEXT_ENTRY_FINISHED:
                self.apply_property_changes()
            
            self.ui_manager.process_events(event)
        
        return True
    
    def run(self):
        running = True
        self.update_buttons() # Init state
        
        while running:
            time_delta = self.clock.tick(60) / 1000.0
            
            running = self.handle_events()
            self.ui_manager.update(time_delta)
            
            self.draw()
            pygame.display.flip()
        
        pygame.quit()


def main():
    editor = LevelEditor()
    editor.run()


if __name__ == "__main__":
    main()
